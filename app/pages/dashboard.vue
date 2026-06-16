<script setup lang="ts">
import { DateTime } from 'luxon';
import { CalendarDays, Heart, Send } from 'lucide-vue-next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { profileStatusValues } from '~/lib/schemas/profile';
import type { ProfileStatus } from '~/lib/types';
import { formatInZone } from '~/lib/utils/time';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Dashboard · UsTime' });

const supabase = useSupabaseClient() as unknown as SupabaseClient;
const user = useSupabaseUser();
const { ctx, refresh } = useCoupleContext();
const { events } = useEvents();
const { partnerOnline, partnerStatus, myStatus, setStatus } = useCoupleChannel();

const me = computed(() => ctx.value?.profile ?? null);
const partner = computed(() => ctx.value?.partner ?? null);

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
	timer = setInterval(() => (now.value = Date.now()), 30_000);
	void loadLastPing();
});
onUnmounted(() => clearInterval(timer));

const people = computed(() =>
	[me.value, partner.value]
		.filter((p): p is NonNullable<typeof p> => p != null)
		.map((p) => ({
			name: p.display_name,
			colour: p.colour,
			time: formatInZone(now.value, p.timezone, 'ccc HH:mm'),
			zone: p.timezone.replace(/_/g, ' ')
		}))
);

// Countdown widget -----------------------------------------------------------
const visits = computed(() => events.value.filter((e) => e.type === 'visit'));
const countdown = computed(() => {
	const today = DateTime.now().startOf('day');
	const upcoming = visits.value
		.filter((v) => DateTime.fromISO(v.starts_at) >= DateTime.now())
		.sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
	if (upcoming) {
		const days = Math.ceil(
			DateTime.fromISO(upcoming.starts_at).startOf('day').diff(today, 'days').days
		);
		return { mode: 'next' as const, title: upcoming.title, days };
	}
	const past = visits.value
		.filter((v) => DateTime.fromISO(v.ends_at) < DateTime.now())
		.sort((a, b) => b.ends_at.localeCompare(a.ends_at))[0];
	if (past) {
		const days = Math.floor(today.diff(DateTime.fromISO(past.ends_at).startOf('day'), 'days').days);
		return { mode: 'since' as const, title: past.title, days };
	}
	return null;
});

// Status ---------------------------------------------------------------------
const statusLabels: Record<ProfileStatus, string> = {
	free: 'Free',
	studying: 'Studying',
	in_class: 'In class',
	sleeping: 'Sleeping'
};

async function chooseStatus(status: ProfileStatus) {
	await setStatus(status);
	const id = user.value?.sub;
	if (id) await supabase.from('profiles').update({ status }).eq('id', id);
	await refresh();
}

// Thinking-of-you ping -------------------------------------------------------
const PING_COOLDOWN_MS = 5 * 60_000;
const lastPingAt = ref(0);
const cooldownLeft = computed(() => Math.max(0, PING_COOLDOWN_MS - (now.value - lastPingAt.value)));
const canPing = computed(() => cooldownLeft.value === 0);

async function loadLastPing() {
	const id = user.value?.sub;
	if (!id) return;
	const { data } = await supabase
		.from('pings')
		.select('sent_at')
		.eq('sender_id', id)
		.order('sent_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	const last = (data as { sent_at: string } | null)?.sent_at;
	if (last) lastPingAt.value = Date.parse(last);
}

async function sendPing() {
	if (!canPing.value) return;
	const coupleId = ctx.value?.couple?.id;
	const id = user.value?.sub;
	if (!coupleId || !id) return;
	const { error } = await supabase.from('pings').insert({ couple_id: coupleId, sender_id: id });
	if (error) {
		toast.error(error.message);
		return;
	}
	lastPingAt.value = Date.now();
	now.value = Date.now();
	toast.success(`Sent ${partner.value?.display_name ?? 'your partner'} a ping 💜`);
}
</script>

<template>
	<div class="mx-auto max-w-3xl space-y-6">
		<div>
			<h1 class="font-display text-3xl font-semibold tracking-tight">
				Hi {{ me?.display_name ?? 'there' }}
			</h1>
			<p class="text-muted-foreground">
				<template v-if="partner">You're paired with {{ partner.display_name }}</template>
				<template v-else>Welcome to your shared space.</template>
			</p>
		</div>

		<!-- Countdown -->
		<Card v-if="partner" class="overflow-hidden">
			<CardHeader>
				<CardTitle>{{
					countdown?.mode === 'since' ? 'Since you last met' : 'Next visit'
				}}</CardTitle>
				<CardDescription>
					<template v-if="countdown">{{ countdown.title }}</template>
					<template v-else
						>No visits planned yet — add a visit event to start a countdown.</template
					>
				</CardDescription>
			</CardHeader>
			<CardContent v-if="countdown" class="flex items-end gap-3">
				<span class="font-display text-6xl leading-none font-semibold tabular-nums">
					{{ countdown.days }}
				</span>
				<span class="pb-1.5 text-muted-foreground">
					{{
						countdown.mode === 'since'
							? 'days since'
							: countdown.days === 1
								? 'day to go'
								: 'days to go'
					}}
				</span>
			</CardContent>
		</Card>

		<!-- Right now -->
		<Card>
			<CardHeader>
				<CardTitle>Right now</CardTitle>
				<CardDescription>Where you both are in time.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				<div v-for="person in people" :key="person.name" class="flex items-center gap-3">
					<span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: person.colour }" />
					<span class="font-medium">{{ person.name }}</span>
					<span
						v-if="partner && person.name === partner.display_name"
						class="size-2 rounded-full"
						:class="partnerOnline ? 'bg-green-500' : 'bg-muted-foreground/40'"
						:title="partnerOnline ? 'Online' : 'Offline'"
					/>
					<span class="ml-auto text-sm text-muted-foreground">{{ person.zone }}</span>
					<span class="w-24 text-right font-display text-lg font-semibold tabular-nums">
						{{ person.time }}
					</span>
				</div>
				<p v-if="partner && partnerStatus" class="text-sm text-muted-foreground">
					{{ partner.display_name }} is {{ statusLabels[partnerStatus].toLowerCase() }}.
				</p>
			</CardContent>
		</Card>

		<!-- Status + ping -->
		<div class="grid gap-6 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Your status</CardTitle>
					<CardDescription>Let {{ partner?.display_name ?? 'your partner' }} know.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-wrap gap-2">
					<Button
						v-for="s in profileStatusValues"
						:key="s"
						size="sm"
						:variant="myStatus === s ? 'default' : 'outline'"
						@click="chooseStatus(s)"
					>
						{{ statusLabels[s] }}
					</Button>
				</CardContent>
			</Card>

			<Card class="flex flex-col">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Heart class="size-5 text-primary" /> Thinking of you
					</CardTitle>
					<CardDescription>Send a little heart across the distance.</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto">
					<Button class="w-full gap-2" :disabled="!canPing || !partner" @click="sendPing">
						<Send class="size-4" />
						<template v-if="canPing">Send a ping</template>
						<template v-else>Wait {{ Math.ceil(cooldownLeft / 60000) }}m</template>
					</Button>
				</CardFooter>
			</Card>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Your shared calendar</CardTitle>
				<CardDescription
					>Plan calls, study sessions and visits across your timezones.</CardDescription
				>
			</CardHeader>
			<CardFooter>
				<Button as-child class="gap-2">
					<NuxtLink to="/calendar"><CalendarDays class="size-4" /> Open calendar</NuxtLink>
				</Button>
			</CardFooter>
		</Card>
	</div>
</template>
