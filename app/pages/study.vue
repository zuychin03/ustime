<script setup lang="ts">
import { DateTime } from 'luxon';
import { Pause, Play, RotateCcw, BookOpen } from 'lucide-vue-next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { StudySessionRow } from '~/lib/types';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Study · UsTime' });

const supabase = useSupabaseClient() as unknown as SupabaseClient;
const user = useSupabaseUser();
const { ctx } = useCoupleContext();
const { send, on, partnerOnline } = useCoupleChannel();

const myId = computed(() => user.value?.sub ?? '');
const coupleId = computed(() => ctx.value?.couple?.id ?? null);
const partner = computed(() => ctx.value?.partner ?? null);

type Phase = 'idle' | 'focus' | 'break';

const focusMin = ref(25);
const breakMin = ref(5);
const phase = ref<Phase>('idle');
const running = ref(false);
const endsAt = ref<number | null>(null);
const pausedRemaining = ref(0);
const pomodoros = ref(0);
const sessionId = ref<string | null>(null);
const startedAt = ref<string | null>(null);
const nowMs = ref(Date.now());

let ticker: ReturnType<typeof setInterval> | undefined;

const remainingMs = computed(() => {
	if (phase.value === 'idle') return focusMin.value * 60_000;
	if (!running.value) return pausedRemaining.value;
	if (endsAt.value == null) return 0;
	return Math.max(0, endsAt.value - nowMs.value);
});

const clock = computed(() => {
	const total = Math.ceil(remainingMs.value / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const phaseLabel = computed(() =>
	phase.value === 'break' ? 'Break' : phase.value === 'focus' ? 'Focus' : 'Ready'
);

function tick() {
	nowMs.value = Date.now();
	if (!running.value || endsAt.value == null) return;
	// Deterministic catch-up: both clients advance off the same endsAt anchor.
	while (running.value && endsAt.value != null && nowMs.value >= endsAt.value) {
		if (phase.value === 'focus') {
			pomodoros.value += 1;
			phase.value = 'break';
			endsAt.value += breakMin.value * 60_000;
		} else {
			phase.value = 'focus';
			endsAt.value += focusMin.value * 60_000;
		}
	}
}

function broadcast(action: 'start' | 'pause' | 'reset') {
	void send('timer', {
		action,
		phase: phase.value,
		endsAt: endsAt.value,
		remaining: pausedRemaining.value,
		focusMin: focusMin.value,
		breakMin: breakMin.value,
		pomodoros: pomodoros.value,
		sessionId: sessionId.value,
		startedAt: startedAt.value
	});
}

function start() {
	if (phase.value === 'idle') {
		sessionId.value = crypto.randomUUID();
		startedAt.value = new Date().toISOString();
		phase.value = 'focus';
		endsAt.value = Date.now() + focusMin.value * 60_000;
	} else {
		endsAt.value = Date.now() + pausedRemaining.value;
	}
	running.value = true;
	broadcast('start');
}

function pause() {
	if (endsAt.value != null) pausedRemaining.value = Math.max(0, endsAt.value - Date.now());
	running.value = false;
	broadcast('pause');
}

async function reset(silent = false) {
	if (!silent) await logSession();
	running.value = false;
	phase.value = 'idle';
	endsAt.value = null;
	pausedRemaining.value = 0;
	pomodoros.value = 0;
	sessionId.value = null;
	startedAt.value = null;
	if (!silent) broadcast('reset');
}

// Sessions -------------------------------------------------------------------
const sessions = ref<StudySessionRow[]>([]);

const totalPomodoros = computed(() =>
	sessions.value.reduce((n, s) => n + s.pomodoros_completed, 0)
);
const totalHours = computed(() => {
	const ms = sessions.value.reduce((acc, s) => {
		if (!s.ended_at) return acc;
		return acc + (Date.parse(s.ended_at) - Date.parse(s.started_at));
	}, 0);
	return (ms / 3_600_000).toFixed(1);
});

async function loadSessions() {
	const id = coupleId.value;
	if (!id) return;
	const { data } = await supabase
		.from('study_sessions')
		.select('*')
		.eq('couple_id', id)
		.order('started_at', { ascending: false })
		.limit(50);
	sessions.value = (data as StudySessionRow[]) ?? [];
}

async function logSession() {
	const id = coupleId.value;
	if (!id || !startedAt.value || pomodoros.value === 0) return;
	const participants = [myId.value, partner.value?.id].filter((x): x is string => !!x);
	const { error } = await supabase.from('study_sessions').insert({
		couple_id: id,
		started_at: startedAt.value,
		ended_at: new Date().toISOString(),
		pomodoros_completed: pomodoros.value,
		participants
	});
	if (error) {
		toast.error('Could not save session');
		return;
	}
	toast.success(`Logged ${pomodoros.value} pomodoro${pomodoros.value === 1 ? '' : 's'}`);
	await loadSessions();
}

onMounted(() => {
	ticker = setInterval(tick, 250);
	void loadSessions();

	on('timer', (payload) => {
		const p = payload as {
			action: 'start' | 'pause' | 'reset';
			phase: Phase;
			endsAt: number | null;
			remaining: number;
			focusMin: number;
			breakMin: number;
			pomodoros: number;
			sessionId: string | null;
			startedAt: string | null;
		};
		focusMin.value = p.focusMin ?? focusMin.value;
		breakMin.value = p.breakMin ?? breakMin.value;
		pomodoros.value = p.pomodoros ?? 0;
		sessionId.value = p.sessionId;
		startedAt.value = p.startedAt;
		if (p.action === 'reset') {
			void reset(true);
		} else if (p.action === 'pause') {
			phase.value = p.phase;
			pausedRemaining.value = p.remaining;
			running.value = false;
		} else {
			phase.value = p.phase;
			endsAt.value = p.endsAt;
			running.value = true;
		}
	});
});

onUnmounted(() => clearInterval(ticker));

const ringStyle = computed(() => {
	const total = (phase.value === 'break' ? breakMin.value : focusMin.value) * 60_000 || 1;
	const pct = phase.value === 'idle' ? 0 : 100 - (remainingMs.value / total) * 100;
	const colour = phase.value === 'break' ? 'var(--chart-2)' : 'var(--primary)';
	return { background: `conic-gradient(${colour} ${pct}%, var(--muted) 0)` };
});
</script>

<template>
	<div class="mx-auto max-w-2xl space-y-6">
		<div>
			<h1 class="font-display text-3xl font-semibold tracking-tight">Study with me</h1>
			<p class="text-muted-foreground">
				A synced Pomodoro timer.
				<span v-if="partner">
					{{ partner.display_name }} is
					<span :class="partnerOnline ? 'text-green-600' : 'text-muted-foreground'">
						{{ partnerOnline ? 'online' : 'offline' }}</span
					>.
				</span>
			</p>
		</div>

		<Card>
			<CardContent class="flex flex-col items-center gap-6 pt-6">
				<div
					class="relative flex size-56 items-center justify-center rounded-full transition-[background]"
					:style="ringStyle"
				>
					<div class="flex size-48 flex-col items-center justify-center rounded-full bg-card">
						<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{{ phaseLabel }}
						</span>
						<span class="font-display text-6xl font-semibold tabular-nums">{{ clock }}</span>
						<span class="text-sm text-muted-foreground">{{ pomodoros }} done</span>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<Button v-if="!running" size="lg" class="gap-2" @click="start">
						<Play class="size-5" /> {{ phase === 'idle' ? 'Start' : 'Resume' }}
					</Button>
					<Button v-else size="lg" variant="secondary" class="gap-2" @click="pause">
						<Pause class="size-5" /> Pause
					</Button>
					<Button
						size="lg"
						variant="outline"
						class="gap-2"
						:disabled="phase === 'idle'"
						@click="reset()"
					>
						<RotateCcw class="size-5" /> End
					</Button>
				</div>

				<div v-if="phase === 'idle'" class="flex items-end gap-4">
					<div class="space-y-1.5">
						<Label for="focus">Focus (min)</Label>
						<Input
							id="focus"
							v-model.number="focusMin"
							type="number"
							min="1"
							max="120"
							class="w-24"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="break">Break (min)</Label>
						<Input
							id="break"
							v-model.number="breakMin"
							type="number"
							min="1"
							max="60"
							class="w-24"
						/>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<BookOpen class="size-5" /> Hours studied together
				</CardTitle>
				<CardDescription>{{ totalHours }} hours · {{ totalPomodoros }} pomodoros</CardDescription>
			</CardHeader>
			<CardContent>
				<ul v-if="sessions.length" class="space-y-1.5 text-sm">
					<li
						v-for="s in sessions.slice(0, 8)"
						:key="s.id"
						class="flex items-center justify-between border-b pb-1.5 last:border-0"
					>
						<span>{{ DateTime.fromISO(s.started_at).toFormat('ccc d LLL, HH:mm') }}</span>
						<span class="text-muted-foreground">{{ s.pomodoros_completed }} pomodoros</span>
					</li>
				</ul>
				<p v-else class="text-sm text-muted-foreground">
					No sessions yet — start a timer to log your first one together.
				</p>
			</CardContent>
		</Card>
	</div>
</template>
