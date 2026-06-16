<script setup lang="ts">
import { DateTime } from 'luxon';
import { Phone, BookOpen, Sparkles } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '~/components/ui/dialog';
import { ownerKindOf } from '~/lib/calendar';
import { findMutualFreeTime, type FreeWindow } from '~/lib/utils/freetime';
import { expandEvent } from '~/lib/utils/recurrence';
import { formatRangeBoth, type Interval } from '~/lib/utils/time';
import type { EventRow, ProfileRow } from '~/lib/types';

const props = defineProps<{
	open: boolean;
	events: EventRow[];
	me: ProfileRow | null;
	partner: ProfileRow | null;
	myId: string;
}>();

const emit = defineEmits<{
	'update:open': [boolean];
	book: [{ start: DateTime; end: DateTime; type: 'call' | 'study' }];
}>();

const minDuration = ref<30 | 60 | 90>(60);
const durations = [30, 60, 90] as const;

function sleepFor(p: ProfileRow) {
	return { start: p.sleep_start.slice(0, 5), end: p.sleep_end.slice(0, 5), zone: p.timezone };
}

const windows = computed<FreeWindow[]>(() => {
	if (!props.me || !props.partner) return [];
	const now = DateTime.utc();
	const horizon: Interval = {
		start: now.toMillis(),
		end: now.plus({ days: 14 }).toMillis()
	};

	const aBusy: Interval[] = [];
	const bBusy: Interval[] = [];
	for (const event of props.events) {
		if (event.all_day || event.type === 'date') continue;
		const kind = ownerKindOf(event.owner_id, props.myId);
		const occ = expandEvent(
			{
				startsAt: event.starts_at,
				endsAt: event.ends_at,
				rrule: event.rrule,
				rruleUntil: event.rrule_until,
				tzid: event.tzid
			},
			now,
			now.plus({ days: 14 })
		);
		for (const o of occ) {
			const iv = { start: o.start.toMillis(), end: o.end.toMillis() };
			if (kind === 'me' || kind === 'shared') aBusy.push(iv);
			if (kind === 'partner' || kind === 'shared') bBusy.push(iv);
		}
	}

	return findMutualFreeTime({
		horizon,
		a: { busy: aBusy, sleep: sleepFor(props.me) },
		b: { busy: bBusy, sleep: sleepFor(props.partner) },
		minDurationMinutes: minDuration.value
	}).slice(0, 30);
});

function label(w: FreeWindow): string {
	if (!props.me || !props.partner) return '';
	return formatRangeBoth(w.start, w.end, props.me.timezone, props.partner.timezone);
}

function durationLabel(w: FreeWindow): string {
	const mins = Math.round((w.end - w.start) / 60000);
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

function book(w: FreeWindow, type: 'call' | 'study') {
	emit('book', {
		start: DateTime.fromMillis(w.start, { zone: 'utc' }),
		end: DateTime.fromMillis(w.end, { zone: 'utc' }),
		type
	});
}
</script>

<template>
	<Dialog :open="open" @update:open="emit('update:open', $event)">
		<DialogContent class="max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2 font-display text-xl">
					<Sparkles class="size-5 text-primary" /> Find time together
				</DialogTitle>
				<DialogDescription>
					Mutual free windows over the next 14 days, skipping events and sleep hours.
				</DialogDescription>
			</DialogHeader>

			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">At least</span>
				<div class="flex gap-1">
					<Button
						v-for="d in durations"
						:key="d"
						type="button"
						size="sm"
						:variant="minDuration === d ? 'default' : 'outline'"
						@click="minDuration = d"
					>
						{{ d }}m
					</Button>
				</div>
			</div>

			<div v-if="windows.length === 0" class="py-8 text-center text-sm text-muted-foreground">
				No mutual free windows found. Try a shorter minimum duration.
			</div>

			<ul v-else class="space-y-2">
				<li
					v-for="(w, i) in windows"
					:key="i"
					class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
				>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5 text-sm font-medium">
							<span class="truncate">{{ label(w) }}</span>
							<span
								v-if="w.score === 2"
								class="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
								title="Comfortable waking hours for both of you"
							>
								golden
							</span>
						</div>
						<span class="text-xs text-muted-foreground">{{ durationLabel(w) }} free</span>
					</div>
					<div class="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							class="gap-1"
							@click="book(w, 'call')"
						>
							<Phone class="size-3.5" /> Call
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							class="gap-1"
							@click="book(w, 'study')"
						>
							<BookOpen class="size-3.5" /> Study
						</Button>
					</div>
				</li>
			</ul>
		</DialogContent>
	</Dialog>
</template>
