<script setup lang="ts">
import { BLADE_WIDTH_PCT, EVENT_TYPE_META, type DaySegment } from '~/lib/calendar';
import { readableTextColor } from '~/lib/utils/blend';
import { formatInZone, formatRangeBoth } from '~/lib/utils/time';

const props = defineProps<{
	segment: DaySegment;
	zone: string;
	myZone: string;
	partnerZone: string;
}>();

const emit = defineEmits<{ select: [] }>();

const occ = computed(() => props.segment.occurrence);
const meta = computed(() => EVENT_TYPE_META[occ.value.event.type]);

const style = computed(() => {
	const { startMin, endMin, clashing, z } = props.segment;
	const top = (startMin / 1440) * 100;
	const height = Math.max(((endMin - startMin) / 1440) * 100, 1.8);
	// Narrowed when clashing, leaving a strip for the blend band beside it.
	const width = clashing ? BLADE_WIDTH_PCT : 100;
	return {
		top: `${top}%`,
		height: `${height}%`,
		left: '2px',
		width: `calc(${width}% - 4px)`,
		zIndex: z,
		backgroundColor: occ.value.colour,
		color: readableTextColor(occ.value.colour)
	};
});

const durationMin = computed(() => props.segment.endMin - props.segment.startMin);
const timeLabel = computed(
	() =>
		`${formatInZone(occ.value.start, props.zone, 'HH:mm')}–${formatInZone(occ.value.end, props.zone, 'HH:mm')}`
);
const ariaLabel = computed(
	() =>
		`${meta.value.label}: ${occ.value.event.title}, ${formatRangeBoth(
			occ.value.start,
			occ.value.end,
			props.myZone,
			props.partnerZone
		)}`
);
const tiny = computed(() => durationMin.value < 30);
const showTime = computed(() => durationMin.value >= 45);
// Tall enough to let a long title wrap onto a second line.
const allowWrap = computed(() => durationMin.value >= 60);
</script>

<template>
	<button
		type="button"
		class="group absolute flex flex-col justify-start overflow-hidden rounded-md border border-black/10 px-1.5 py-1 text-left shadow-sm ring-offset-background transition-shadow hover:z-40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-white/10"
		:style="style"
		:aria-label="ariaLabel"
		@click.stop="emit('select')"
		@pointerdown.stop
	>
		<span
			class="flex items-start gap-1 font-semibold"
			:class="tiny ? 'text-[10px] leading-none' : 'text-xs leading-tight'"
		>
			<component :is="meta.icon" class="mt-px size-3 shrink-0" />
			<span :class="allowWrap ? 'line-clamp-2 break-words' : 'truncate'">{{
				occ.event.title
			}}</span>
		</span>
		<span v-if="showTime" class="mt-0.5 block text-[10px] leading-tight tabular-nums opacity-90">
			{{ timeLabel }}
		</span>
	</button>
</template>
