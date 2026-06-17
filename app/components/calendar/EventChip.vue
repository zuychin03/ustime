<script setup lang="ts">
import {
	BLADE_WIDTH_PCT,
	EVENT_TYPE_META,
	HANDLE_WIDTH_PCT,
	type DaySegment
} from '~/lib/calendar';
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
const isKnife = computed(() => props.segment.knife);

// Fraction of the tile height taken by the blade (the rest is the thin handle).
const bladeFrac = computed(() => {
	const { startMin, endMin, bladeEndMin } = props.segment;
	const dur = endMin - startMin;
	if (dur <= 0) return 1;
	return Math.min(1, Math.max(0, (bladeEndMin - startMin) / dur));
});
const hasHandle = computed(() => isKnife.value && bladeFrac.value < 0.999);

const containerStyle = computed(() => {
	const { startMin, endMin, z } = props.segment;
	const top = (startMin / 1440) * 100;
	const height = Math.max(((endMin - startMin) / 1440) * 100, 1.8);
	return {
		top: `${top}%`,
		height: `${height}%`,
		left: '2px',
		width: isKnife.value ? `calc(${BLADE_WIDTH_PCT}% - 4px)` : 'calc(100% - 4px)',
		zIndex: z
	};
});

const fill = computed(() => ({
	backgroundColor: occ.value.colour,
	color: readableTextColor(occ.value.colour)
}));

const bladeStyle = computed(() => ({
	...fill.value,
	height: hasHandle.value ? `${(bladeFrac.value * 100).toFixed(3)}%` : '100%'
}));

// The handle overlaps a few px into the blade so the shared fill reads as one piece.
const handleStyle = computed(() => ({
	...fill.value,
	top: `calc(${(bladeFrac.value * 100).toFixed(3)}% - 6px)`,
	height: `calc(${((1 - bladeFrac.value) * 100).toFixed(3)}% + 6px)`,
	width: `${((HANDLE_WIDTH_PCT / BLADE_WIDTH_PCT) * 100).toFixed(3)}%`
}));

// Label sits in the blade, so size it off the blade's height, not the full tile.
const labelMin = computed(() =>
	isKnife.value
		? props.segment.bladeEndMin - props.segment.startMin
		: props.segment.endMin - props.segment.startMin
);
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
const tiny = computed(() => labelMin.value < 30);
const showTime = computed(() => labelMin.value >= 45);
// Tall enough to let a long title wrap onto a second line.
const allowWrap = computed(() => labelMin.value >= 60);
</script>

<template>
	<div class="pointer-events-none absolute" :style="containerStyle">
		<!-- Handle first (under the blade) so the blade's fill hides the overlap seam -->
		<button
			v-if="hasHandle"
			type="button"
			class="pointer-events-auto absolute left-0 rounded-b-md ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			:style="handleStyle"
			:aria-label="ariaLabel"
			@click.stop="emit('select')"
			@pointerdown.stop
		/>
		<!-- Blade — carries the label; full tile when there's no handle -->
		<button
			type="button"
			class="group pointer-events-auto absolute inset-x-0 top-0 flex flex-col justify-start overflow-hidden px-1.5 py-1 text-left ring-offset-background transition-shadow hover:z-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			:class="
				hasHandle
					? 'rounded-t-md rounded-br-md'
					: 'rounded-md border border-black/10 shadow-sm hover:shadow-md dark:border-white/10'
			"
			:style="bladeStyle"
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
	</div>
</template>
