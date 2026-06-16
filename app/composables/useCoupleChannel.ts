import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/vue-query';
import type { ProfileStatus } from '~/lib/types';

export type ChannelEvent = 'ping' | 'timer' | 'status';

export interface PresenceMeta {
	userId: string;
	status: ProfileStatus;
}

type Handler = (payload: Record<string, unknown>) => void;

interface SharedChannel {
	channel: RealtimeChannel;
	coupleId: string;
	refs: number;
}

let shared: SharedChannel | null = null;
// Listeners persist independently of the channel lifecycle so callers can
// register handlers during setup, before the channel finishes subscribing.
const listeners = new Map<ChannelEvent, Set<Handler>>();

export function useCoupleChannel() {
	const supabase = useSupabaseClient() as unknown as SupabaseClient;
	const user = useSupabaseUser();
	const { ctx } = useCoupleContext();
	const queryClient = useQueryClient();

	const presence = useState<Record<string, PresenceMeta>>('couple-presence', () => ({}));
	const myStatus = useState<ProfileStatus>('my-status', () => ctx.value?.profile?.status ?? 'free');

	const myId = computed(() => user.value?.sub ?? '');
	const partnerId = computed(() => ctx.value?.partner?.id ?? null);

	const partnerOnline = computed(() => {
		const id = partnerId.value;
		return !!id && Object.values(presence.value).some((m) => m.userId === id);
	});
	const partnerStatus = computed<ProfileStatus | null>(() => {
		const id = partnerId.value;
		if (!id) return null;
		const meta = Object.values(presence.value).find((m) => m.userId === id);
		return meta?.status ?? ctx.value?.partner?.status ?? null;
	});

	function dispatch(event: ChannelEvent, payload: Record<string, unknown>) {
		listeners.get(event)?.forEach((h) => h(payload));
	}

	function setup() {
		const coupleId = ctx.value?.couple?.id;
		const uid = myId.value;
		if (!coupleId || !uid) return;

		if (shared && shared.coupleId === coupleId) {
			shared.refs++;
			return;
		}
		if (shared) teardown(true);

		const channel = supabase.channel(`couple:${coupleId}`, {
			config: { presence: { key: uid }, broadcast: { self: false } }
		});

		channel.on('presence', { event: 'sync' }, () => {
			const state = channel.presenceState<PresenceMeta>();
			const flat: Record<string, PresenceMeta> = {};
			for (const [key, metas] of Object.entries(state)) {
				const last = metas[metas.length - 1];
				if (last) flat[key] = { userId: last.userId, status: last.status };
			}
			presence.value = flat;
		});

		// Ephemeral, low-latency signals.
		(['timer', 'status'] as ChannelEvent[]).forEach((event) => {
			channel.on('broadcast', { event }, ({ payload }) =>
				dispatch(event, (payload ?? {}) as Record<string, unknown>)
			);
		});

		channel.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${coupleId}` },
			() => queryClient.invalidateQueries({ queryKey: ['events', coupleId] })
		);

		// Pings are delivered DB-side so they arrive reliably whenever the partner
		// is online (not just if a broadcast happens to land).
		channel.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'pings', filter: `couple_id=eq.${coupleId}` },
			(payload) => {
				const row = (payload as { new?: { sender_id?: string } }).new;
				if (row?.sender_id && row.sender_id !== uid) dispatch('ping', { senderId: row.sender_id });
			}
		);

		channel.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				void channel.track({ userId: uid, status: myStatus.value });
			}
		});

		shared = { channel, coupleId, refs: 1 };
	}

	function teardown(force = false) {
		if (!shared) return;
		shared.refs--;
		if (shared.refs > 0 && !force) return;
		void supabase.removeChannel(shared.channel);
		shared = null;
		presence.value = {};
	}

	function on(event: ChannelEvent, handler: Handler) {
		let set = listeners.get(event);
		if (!set) {
			set = new Set();
			listeners.set(event, set);
		}
		set.add(handler);
		const off = () => listeners.get(event)?.delete(handler);
		onScopeDispose(off);
		return off;
	}

	async function send(event: ChannelEvent, payload: Record<string, unknown>) {
		if (!shared) return;
		await shared.channel.send({ type: 'broadcast', event, payload });
	}

	async function setStatus(status: ProfileStatus) {
		myStatus.value = status;
		const uid = myId.value;
		if (shared && uid) await shared.channel.track({ userId: uid, status });
		await send('status', { userId: uid, status });
	}

	onMounted(setup);
	onUnmounted(() => teardown());

	return {
		presence,
		partnerOnline,
		partnerStatus,
		myStatus,
		on,
		send,
		setStatus
	};
}
