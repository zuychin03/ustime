<script setup lang="ts">
import type { OverlapSegment } from '~/lib/calendar';

const props = defineProps<{ segments: OverlapSegment[] }>();
const emit = defineEmits<{ select: [OverlapSegment] }>();

function styleFor(seg: OverlapSegment) {
	const top = (seg.start / 1440) * 100;
	const height = Math.max(((seg.end - seg.start) / 1440) * 100, 0.6);
	return {
		top: `${top}%`,
		height: `${height}%`,
		left: '2px',
		width: 'calc(100% - 4px)',
		zIndex: seg.z,
		// Softened toward the background (not CSS opacity) so it reads as a real
		// blend rather than muddying against the tiles around it.
		backgroundColor: `color-mix(in srgb, ${seg.colour} 78%, var(--card))`
	};
}
</script>

<template>
	<!-- Full-width blend band behind a clashing tile. Its exposed strip (beside the
	tile) opens the "you're both busy" details for both activities. -->
	<button
		v-for="(seg, i) in props.segments"
		:key="i"
		type="button"
		class="absolute cursor-pointer rounded-md transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
		:style="styleFor(seg)"
		:aria-label="`Both busy: ${seg.titles[0]} and ${seg.titles[1]}`"
		:title="`Together: ${seg.titles[0]} + ${seg.titles[1]}`"
		@click.stop="emit('select', seg)"
		@pointerdown.stop
	/>
</template>
