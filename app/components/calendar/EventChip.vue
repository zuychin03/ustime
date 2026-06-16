<script setup lang="ts">
import { EVENT_TYPE_META, type DaySegment } from '~/lib/calendar';
import { readableTextColor } from '~/lib/utils/blend';
import { formatInZone, formatRangeBoth } from '~/lib/utils/time';

const props = withDefaults(
	defineProps<{
		segment: DaySegment;
		zone: string;
		myZone: string;
		partnerZone: string;
		anchor?: 'top' | 'bottom';
	}>(),
	{ anchor: 'top' }
);

const emit = defineEmits<{ select: [] }>();

const occ = computed(() => props.segment.occurrence);
const meta = computed(() => EVENT_TYPE_META[occ.value.event.type]);

const style = computed(() => {
	const { startMin, endMin, lane, lanes } = props.segment;
	const top = (startMin / 1440) * 100;
	const height = Math.max(((endMin - startMin) / 1440) * 100, 1.8);

	// Overlapping events cascade (offset, full-width-to-right) so each keeps
	// enough width to show its title.
	const stepPct = lanes > 1 ? Math.min(22, 66 / lanes) : 0;
	const leftPct = lane * stepPct;
	return {
		top: `${top}%`,
		height: `${height}%`,
		left: `calc(${leftPct}% + 2px)`,
		width: `calc(${100 - leftPct}% - 4px)`,
		zIndex: 10 + lane,
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
		class="group absolute flex flex-col overflow-hidden rounded-md border border-black/10 px-1.5 py-1 text-left shadow-sm ring-offset-background transition-shadow hover:z-40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-white/10"
		:class="anchor === 'bottom' ? 'justify-end' : 'justify-start'"
		:style="style"
		:aria-label="ariaLabel"
		@click.stop="emit('select')"
	>
		<span
			class="flex items-start gap-1 font-semibold"
			:class="[
				tiny ? 'text-[10px] leading-none' : 'text-xs leading-tight',
				anchor === 'bottom' ? 'order-last' : ''
			]"
		>
			<component :is="meta.icon" class="mt-px size-3 shrink-0" />
			<span :class="allowWrap ? 'line-clamp-2 break-words' : 'truncate'">{{
				occ.event.title
			}}</span>
		</span>
		<span
			v-if="showTime"
			class="block text-[10px] leading-tight tabular-nums opacity-90"
			:class="anchor === 'bottom' ? 'mb-0.5' : 'mt-0.5'"
		>
			{{ timeLabel }}
		</span>
	</button>
</template>
