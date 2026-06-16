<script setup lang="ts">
import { DateTime } from 'luxon';
import { expandOccurrences, type Occurrence } from '~/lib/calendar';
import type { EventRow } from '~/lib/types';

const props = defineProps<{
	month: DateTime; // any day within the month, in viewer zone
	events: EventRow[];
	zone: string;
	myId: string;
	myColour: string;
	partnerColour: string;
}>();

const emit = defineEmits<{ selectDay: [DateTime] }>();

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const gridStart = computed(() => props.month.startOf('month').startOf('week'));

const occurrences = computed<Occurrence[]>(() => {
	const from = gridStart.value.toUTC();
	const to = gridStart.value.plus({ days: 42 }).toUTC();
	return expandOccurrences({
		events: props.events,
		from,
		to,
		myId: props.myId,
		myColour: props.myColour,
		partnerColour: props.partnerColour
	});
});

const cells = computed(() => {
	const today = DateTime.now().setZone(props.zone);
	return Array.from({ length: 42 }, (_, i) => {
		const day = gridStart.value.plus({ days: i });
		const dayEvents = occurrences.value
			.filter((o) => o.start.setZone(props.zone).hasSame(day, 'day'))
			.sort((a, b) => a.start.toMillis() - b.start.toMillis())
			.map((o) => ({ key: o.key, title: o.event.title, colour: o.colour }));
		return {
			day,
			inMonth: day.hasSame(props.month, 'month'),
			isToday: day.hasSame(today, 'day'),
			isWeekend: day.weekday >= 6,
			events: dayEvents.slice(0, 3),
			more: Math.max(0, dayEvents.length - 3),
			dots: dayEvents.slice(0, 5).map((e) => e.colour),
			dotMore: Math.max(0, dayEvents.length - 5)
		};
	});
});
</script>

<template>
	<div class="overflow-hidden rounded-xl border bg-card">
		<div class="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
			<div
				v-for="(d, i) in weekdayNames"
				:key="d"
				class="px-2 py-2 text-center"
				:class="i >= 5 ? 'text-muted-foreground/60' : ''"
			>
				<span class="hidden sm:inline">{{ d }}</span>
				<span class="sm:hidden">{{ d.charAt(0) }}</span>
			</div>
		</div>
		<div class="grid grid-cols-7">
			<button
				v-for="(cell, i) in cells"
				:key="cell.day.toMillis()"
				type="button"
				class="group relative flex min-h-[68px] flex-col gap-1 border-b border-l p-1 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:min-h-[104px] sm:p-1.5"
				:class="[
					i % 7 === 0 ? 'border-l-0' : '',
					i >= 35 ? 'border-b-0' : '',
					!cell.inMonth ? 'bg-muted/20' : cell.isWeekend ? 'bg-muted/10' : ''
				]"
				@click="emit('selectDay', cell.day)"
			>
				<span
					class="flex size-6 items-center justify-center self-start rounded-full text-xs font-semibold tabular-nums"
					:class="
						cell.isToday
							? 'bg-primary text-primary-foreground'
							: cell.inMonth
								? 'text-foreground'
								: 'text-muted-foreground/40'
					"
				>
					{{ cell.day.day }}
				</span>

				<!-- Compact dots on mobile -->
				<span class="flex flex-wrap gap-1 px-0.5 sm:hidden">
					<span
						v-for="(dot, di) in cell.dots"
						:key="di"
						class="size-1.5 rounded-full"
						:style="{ backgroundColor: dot }"
					/>
					<span v-if="cell.dotMore" class="text-[8px] leading-none text-muted-foreground">
						+{{ cell.dotMore }}
					</span>
				</span>

				<!-- Event pills on larger screens -->
				<span class="hidden flex-col gap-0.5 sm:flex">
					<span
						v-for="ev in cell.events"
						:key="ev.key"
						class="flex items-center gap-1.5 overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight text-foreground/80 group-hover:bg-background/50"
					>
						<span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: ev.colour }" />
						<span class="truncate">{{ ev.title }}</span>
					</span>
					<span v-if="cell.more" class="px-1 text-[10px] font-medium text-muted-foreground">
						+{{ cell.more }} more
					</span>
				</span>
			</button>
		</div>
	</div>
</template>
