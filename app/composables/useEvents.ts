import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventRow, EventType, EventVisibility } from '~/lib/types';

export interface EventWritePayload {
	title: string;
	description: string | null;
	type: EventType;
	owner_id: string | null;
	starts_at: string;
	ends_at: string;
	all_day: boolean;
	colour_override: string | null;
	rrule: string | null;
	rrule_until: string | null;
	tzid: string | null;
	location: string | null;
	visibility: EventVisibility;
}

const SELECT = '*';

export function useEvents() {
	const supabase = useSupabaseClient() as unknown as SupabaseClient;
	const { ctx } = useCoupleContext();
	const queryClient = useQueryClient();

	const coupleId = computed(() => ctx.value?.couple?.id ?? null);
	const queryKey = computed(() => ['events', coupleId.value]);

	const query = useQuery({
		queryKey,
		enabled: computed(() => import.meta.client && !!coupleId.value),
		queryFn: async (): Promise<EventRow[]> => {
			const id = coupleId.value;
			if (!id) return [];
			const { data, error } = await supabase
				.from('events')
				.select(SELECT)
				.eq('couple_id', id)
				.order('starts_at', { ascending: true });
			if (error) throw new Error(error.message);
			return (data as EventRow[]) ?? [];
		}
	});

	const events = computed<EventRow[]>(() => query.data.value ?? []);

	function snapshot() {
		return queryClient.getQueryData<EventRow[]>(queryKey.value) ?? [];
	}

	const createEvent = useMutation({
		mutationFn: async (payload: EventWritePayload): Promise<EventRow> => {
			const id = coupleId.value;
			if (!id) throw new Error('No couple');
			const { data, error } = await supabase
				.from('events')
				.insert({ ...payload, couple_id: id })
				.select(SELECT)
				.single();
			if (error) throw new Error(error.message);
			return data as EventRow;
		},
		onMutate: async (payload) => {
			await queryClient.cancelQueries({ queryKey: queryKey.value });
			const previous = snapshot();
			const now = new Date().toISOString();
			const optimistic: EventRow = {
				id: `optimistic-${crypto.randomUUID()}`,
				couple_id: coupleId.value ?? '',
				external_id: null,
				source: 'app',
				created_at: now,
				updated_at: now,
				...payload
			};
			queryClient.setQueryData<EventRow[]>(queryKey.value, [...previous, optimistic]);
			return { previous };
		},
		onError: (_e, _v, context) => {
			if (context?.previous) queryClient.setQueryData(queryKey.value, context.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKey.value })
	});

	const updateEvent = useMutation({
		mutationFn: async (input: EventWritePayload & { id: string }): Promise<EventRow> => {
			const { id, ...payload } = input;
			const { data, error } = await supabase
				.from('events')
				.update(payload)
				.eq('id', id)
				.select(SELECT)
				.single();
			if (error) throw new Error(error.message);
			return data as EventRow;
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: queryKey.value });
			const previous = snapshot();
			queryClient.setQueryData<EventRow[]>(
				queryKey.value,
				previous.map((e) => (e.id === input.id ? { ...e, ...input } : e))
			);
			return { previous };
		},
		onError: (_e, _v, context) => {
			if (context?.previous) queryClient.setQueryData(queryKey.value, context.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKey.value })
	});

	const deleteEvent = useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await supabase.from('events').delete().eq('id', id);
			if (error) throw new Error(error.message);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: queryKey.value });
			const previous = snapshot();
			queryClient.setQueryData<EventRow[]>(
				queryKey.value,
				previous.filter((e) => e.id !== id)
			);
			return { previous };
		},
		onError: (_e, _v, context) => {
			if (context?.previous) queryClient.setQueryData(queryKey.value, context.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKey.value })
	});

	function invalidate() {
		return queryClient.invalidateQueries({ queryKey: queryKey.value });
	}

	return {
		events,
		isLoading: query.isLoading,
		isError: query.isError,
		createEvent,
		updateEvent,
		deleteEvent,
		invalidate
	};
}
