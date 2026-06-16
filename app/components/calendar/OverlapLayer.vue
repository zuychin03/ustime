<script setup lang="ts">
import type { OverlapSegment } from '~/lib/calendar';
import { readableTextColor } from '~/lib/utils/blend';

const props = defineProps<{ segments: OverlapSegment[] }>();
const emit = defineEmits<{ select: [OverlapSegment] }>();

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
		class="absolute inset-x-0.5 z-20 flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
		:style="styleFor(seg)"
		:aria-label="`Both busy: ${seg.titles[0]} and ${seg.titles[1]}`"
		:title="`Together: ${seg.titles[0]} + ${seg.titles[1]}`"
		@click.stop="emit('select', seg)"
		@pointerdown.stop
	>
		<!-- An activity hidden entirely under the band shows its label here. -->
		<span
			v-for="(t, j) in seg.coveredTitles"
			v-show="seg.end - seg.start >= 30"
			:key="j"
			class="max-w-full truncate text-[11px] leading-tight font-semibold"
			:style="{ color: readableTextColor(seg.colour) }"
		>
			{{ t }}
		</span>
	</button>
</template>
