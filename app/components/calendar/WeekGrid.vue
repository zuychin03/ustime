<script setup lang="ts">
import { DateTime } from 'luxon';
import {
	allDayForDay,
	daySegments,
	labelAnchor,
	overlapSegments,
	type Occurrence,
	type OverlapSegment
} from '~/lib/calendar';
import type { EventRow } from '~/lib/types';
import { readableTextColor } from '~/lib/utils/blend';
import EventChip from './EventChip.vue';
import OverlapLayer from './OverlapLayer.vue';

const props = defineProps<{
	days: DateTime[]; // 7 day-starts in the primary (viewer) zone
	occurrences: Occurrence[]; // timed occurrences across the week
	events: EventRow[]; // raw rows, for all-day band
	zone: string; // primary axis zone
	myZone: string;
	partnerZone: string;
	axisMode: 'mine' | 'theirs' | 'both';
	myId: string;
	myColour: string;
	partnerColour: string;
}>();

const emit = defineEmits<{
	create: [{ start: DateTime; end: DateTime }];
	select: [Occurrence];
	selectOverlap: [OverlapSegment];
}>();

const HOUR_HEIGHT = 56;
const hours = Array.from({ length: 24 }, (_, i) => i);

const secondaryZone = computed(() => {
	if (props.axisMode !== 'both') return null;
	return props.zone === props.myZone ? props.partnerZone : props.myZone;
});

const gridCols = computed(
	() => `${secondaryZone.value ? '4rem' : '3.25rem'} repeat(7, minmax(0, 1fr))`
);

const hourLabels = computed(() =>
	hours.map((h) => {
		const primary = String(h).padStart(2, '0') + ':00';
		let secondary: string | null = null;
		if (secondaryZone.value && props.days[0]) {
			const instant = props.days[0].set({ hour: h, minute: 0, second: 0 });
			secondary = instant.setZone(secondaryZone.value).toFormat('HH:mm');
		}
		return { primary, secondary };
	})
);

const columns = computed(() =>
	props.days.map((day) => {
		const segs = daySegments(props.occurrences, day, props.zone);
		const mine = segs.filter((s) => s.occurrence.ownerKind === 'me');
		const theirs = segs.filter((s) => s.occurrence.ownerKind === 'partner');
		const overlaps = overlapSegments(mine, theirs, props.myColour, props.partnerColour);
		return {
			day,
			label: day.toFormat('ccc'),
			dayNum: day.toFormat('d'),
			isToday: day.hasSame(DateTime.now().setZone(props.zone), 'day'),
			isWeekend: day.weekday > 5,
			segments: segs.map((seg) => ({ seg, anchor: labelAnchor(seg, overlaps) })),
			overlaps,
			allDay: allDayForDay(
				props.events,
				day,
				props.zone,
				props.myId,
				props.myColour,
				props.partnerColour
			)
		};
	})
);

const hasAllDay = computed(() => columns.value.some((c) => c.allDay.length > 0));

const nowTop = computed(() => {
	const now = DateTime.now().setZone(props.zone);
	return ((now.hour * 60 + now.minute) / 1440) * 100;
});

// Auto-scroll the grid to the morning on first paint.
const scroller = ref<HTMLElement | null>(null);
onMounted(() => {
	const target = Math.max(0, (DateTime.now().setZone(props.zone).hour - 1) * HOUR_HEIGHT);
	requestAnimationFrame(() => scroller.value?.scrollTo({ top: target }));
});

// Drag-to-create -------------------------------------------------------------
interface Draft {
	dayIndex: number;
	startMin: number;
	endMin: number;
}
const draft = ref<Draft | null>(null);
let anchorMin = 0;

function minutesFromEvent(e: PointerEvent): number {
	const el = e.currentTarget as HTMLElement;
	const rect = el.getBoundingClientRect();
	const ratio = (e.clientY - rect.top) / rect.height;
	const min = Math.round((ratio * 1440) / 15) * 15;
	return Math.max(0, Math.min(1440, min));
}

function onPointerDown(e: PointerEvent, dayIndex: number) {
	if (e.button !== 0) return;
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	anchorMin = minutesFromEvent(e);
	draft.value = { dayIndex, startMin: anchorMin, endMin: anchorMin + 15 };
}

function onPointerMove(e: PointerEvent) {
	if (!draft.value) return;
	const min = minutesFromEvent(e);
	draft.value.startMin = Math.min(anchorMin, min);
	draft.value.endMin = Math.max(anchorMin + 15, min);
}

function onPointerUp() {
	const d = draft.value;
	draft.value = null;
	if (!d) return;
	const day = props.days[d.dayIndex];
	if (!day) return;
	const isTap = d.endMin - d.startMin <= 15;
	const startMin = d.startMin;
	const endMin = isTap ? Math.min(1440, startMin + 60) : d.endMin;
	emit('create', {
		start: day.plus({ minutes: startMin }),
		end: day.plus({ minutes: endMin })
	});
}

function draftStyle(d: Draft) {
	const top = (d.startMin / 1440) * 100;
	const height = ((d.endMin - d.startMin) / 1440) * 100;
	return { top: `${top}%`, height: `${height}%` };
}
</script>

<template>
	<div class="overflow-hidden rounded-xl border bg-card">
		<div ref="scroller" class="relative overflow-auto" style="max-height: calc(100dvh - 13rem)">
			<div class="min-w-[820px]">
				<!-- Header: weekday + optional all-day band -->
				<div
					class="sticky top-0 z-30 grid border-b bg-card/95 backdrop-blur"
					:style="{ gridTemplateColumns: gridCols }"
				>
					<div
						class="sticky left-0 z-10 flex items-end justify-center bg-card/95 pb-1 text-[10px] text-muted-foreground backdrop-blur"
					>
						<span v-if="secondaryZone">both</span>
					</div>
					<div
						v-for="col in columns"
						:key="col.day.toMillis()"
						class="border-l px-1 py-2 text-center"
						:class="col.isWeekend ? 'bg-muted/30' : ''"
					>
						<div class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							{{ col.label }}
						</div>
						<div
							class="mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold"
							:class="col.isToday ? 'bg-primary text-primary-foreground' : ''"
						>
							{{ col.dayNum }}
						</div>
						<div v-if="hasAllDay" class="mt-1 min-h-4 space-y-0.5">
							<div
								v-for="chip in col.allDay"
								:key="chip.event.id"
								class="truncate rounded px-1 py-0.5 text-[10px] font-medium"
								:style="{ backgroundColor: chip.colour, color: readableTextColor(chip.colour) }"
								:title="chip.event.title"
							>
								{{ chip.event.title }}
							</div>
						</div>
					</div>
				</div>

				<!-- Body: time axis + day columns -->
				<div class="grid" :style="{ gridTemplateColumns: gridCols }">
					<!-- Time axis (sticky to the left while scrolling horizontally) -->
					<div class="sticky left-0 z-20 bg-card">
						<div
							v-for="(label, h) in hourLabels"
							:key="h"
							class="relative border-t border-border/40"
							:style="{ height: `${HOUR_HEIGHT}px` }"
						>
							<span
								class="absolute top-0.5 right-2 text-[11px] leading-none text-muted-foreground tabular-nums"
							>
								{{ label.primary }}
							</span>
							<span
								v-if="label.secondary"
								class="absolute top-4 right-2 text-[10px] leading-none text-muted-foreground/60 tabular-nums"
							>
								{{ label.secondary }}
							</span>
						</div>
					</div>

					<!-- Day columns -->
					<div
						v-for="(col, dayIndex) in columns"
						:key="col.day.toMillis()"
						class="relative border-l"
						:class="col.isWeekend ? 'bg-muted/20' : ''"
						:style="{ minHeight: `${HOUR_HEIGHT * 24}px` }"
					>
						<!-- background + pointer surface for drag-to-create -->
						<div
							class="absolute inset-0 touch-none"
							@pointerdown="onPointerDown($event, dayIndex)"
							@pointermove="onPointerMove"
							@pointerup="onPointerUp"
						>
							<div
								v-for="h in hours"
								:key="h"
								class="border-t border-border/40"
								:style="{ height: `${HOUR_HEIGHT}px` }"
							/>
						</div>

						<OverlapLayer :segments="col.overlaps" @select="emit('selectOverlap', $event)" />

						<EventChip
							v-for="entry in col.segments"
							:key="entry.seg.occurrence.key"
							:segment="entry.seg"
							:anchor="entry.anchor"
							:zone="zone"
							:my-zone="myZone"
							:partner-zone="partnerZone"
							@pointerdown.stop
							@select="emit('select', entry.seg.occurrence)"
						/>

						<!-- drag draft -->
						<div
							v-if="draft && draft.dayIndex === dayIndex"
							class="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-primary bg-primary/15"
							:style="draftStyle(draft)"
						/>

						<!-- now line -->
						<div
							v-if="col.isToday"
							class="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-500"
							:style="{ top: `${nowTop}%` }"
						>
							<span class="absolute -top-1 -left-1 size-2 rounded-full bg-red-500" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
