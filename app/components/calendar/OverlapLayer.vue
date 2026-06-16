<script setup lang="ts">
import { EVENT_TYPE_META, type Occurrence, type OverlapSegment } from '~/lib/calendar';
import { readableTextColor } from '~/lib/utils/blend';
import { formatInZone } from '~/lib/utils/time';

const props = defineProps<{ segments: OverlapSegment[]; zone: string }>();
const emit = defineEmits<{ select: [OverlapSegment] }>();

function timeLabel(occ: Occurrence) {
	return `${formatInZone(occ.start, props.zone, 'HH:mm')}–${formatInZone(occ.end, props.zone, 'HH:mm')}`;
}

function styleFor(seg: OverlapSegment) {
	const top = (seg.start / 1440) * 100;
	const height = Math.max(((seg.end - seg.start) / 1440) * 100, 0.6);
	return {
		top: `${top}%`,
		height: `${height}%`,
		// Softened toward the background (not CSS opacity) so it stays a realistic
		// blend instead of muddying against the coloured tiles underneath.
		backgroundColor: `color-mix(in srgb, ${seg.colour} 65%, var(--card))`
	};
}
</script>

<template>
	<!-- Overlapping slice takes the mixed colour; clicking opens both plans. -->
	<button
		v-for="(seg, i) in props.segments"
		:key="i"
		type="button"
		class="absolute inset-x-0.5 z-20 flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md px-1.5 py-1 text-left transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
		:style="styleFor(seg)"
		:aria-label="`Both busy: ${seg.titles[0]} and ${seg.titles[1]}`"
		:title="`Together: ${seg.titles[0]} + ${seg.titles[1]}`"
		@click.stop="emit('select', seg)"
		@pointerdown.stop
	>
		<!-- An activity hidden entirely under the band shows its label here,
		matching the normal tile style (icon + title + time, upper-left). -->
		<span
			v-for="occ in seg.covered"
			:key="occ.key"
			class="block"
			:style="{ color: readableTextColor(seg.colour) }"
		>
			<span class="flex items-start gap-1 text-xs leading-tight font-semibold">
				<component :is="EVENT_TYPE_META[occ.event.type].icon" class="mt-px size-3 shrink-0" />
				<span class="truncate">{{ occ.event.title }}</span>
			</span>
			<span
				v-if="seg.end - seg.start >= 45"
				class="mt-0.5 block text-[10px] leading-tight tabular-nums opacity-90"
			>
				{{ timeLabel(occ) }}
			</span>
		</span>
	</button>
</template>
