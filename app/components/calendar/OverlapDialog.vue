<script setup lang="ts">
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '~/components/ui/dialog';
import { EVENT_TYPE_META, type Occurrence, type OverlapSegment } from '~/lib/calendar';
import { readableTextColor } from '~/lib/utils/blend';
import { formatInZone } from '~/lib/utils/time';

const props = defineProps<{
	open: boolean;
	segment: OverlapSegment | null;
	myName: string;
	partnerName: string;
	myZone: string;
	partnerZone: string;
	viewerZone: string;
}>();

const emit = defineEmits<{ 'update:open': [boolean] }>();

interface PlanCard {
	occ: Occurrence;
	name: string;
}

const cards = computed<PlanCard[]>(() => {
	if (!props.segment) return [];
	return [
		{ occ: props.segment.mine, name: props.myName },
		{ occ: props.segment.theirs, name: props.partnerName }
	];
});

function metaFor(occ: Occurrence) {
	return EVENT_TYPE_META[occ.event.type];
}

function rangeIn(occ: Occurrence, zone: string) {
	return `${formatInZone(occ.start, zone, 'HH:mm')}–${formatInZone(occ.end, zone, 'HH:mm')}`;
}

const overlapLabel = computed(() => {
	const seg = props.segment;
	if (!seg) return '';
	const toClock = (min: number) =>
		`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
	return `${toClock(seg.start)}–${toClock(seg.end)}`;
});
</script>

<template>
	<Dialog :open="open" @update:open="emit('update:open', $event)">
		<DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
			<DialogHeader>
				<DialogTitle class="font-display text-xl">You're both busy</DialogTitle>
				<DialogDescription>
					Overlapping {{ overlapLabel }} in your timezone ({{ viewerZone.replace(/_/g, ' ') }}).
				</DialogDescription>
			</DialogHeader>

			<div class="grid gap-3 sm:grid-cols-2">
				<div v-for="(card, i) in cards" :key="i" class="overflow-hidden rounded-lg border bg-card">
					<div
						class="flex items-center gap-2 px-3 py-2 text-sm font-semibold"
						:style="{
							backgroundColor: card.occ.colour,
							color: readableTextColor(card.occ.colour)
						}"
					>
						<component :is="metaFor(card.occ).icon" class="size-4 shrink-0" />
						<span class="truncate">{{ card.name }}</span>
					</div>
					<div class="space-y-2 p-3">
						<p class="font-medium break-words">{{ card.occ.event.title }}</p>
						<p class="text-xs text-muted-foreground">{{ metaFor(card.occ).label }}</p>

						<dl class="space-y-1 text-sm">
							<div class="flex justify-between gap-2">
								<dt class="text-muted-foreground">{{ myName }}'s time</dt>
								<dd class="tabular-nums">{{ rangeIn(card.occ, myZone) }}</dd>
							</div>
							<div class="flex justify-between gap-2">
								<dt class="text-muted-foreground">{{ partnerName }}'s time</dt>
								<dd class="tabular-nums">{{ rangeIn(card.occ, partnerZone) }}</dd>
							</div>
						</dl>

						<p v-if="card.occ.event.location" class="text-xs text-muted-foreground">
							{{ card.occ.event.location }}
						</p>
					</div>
				</div>
			</div>
		</DialogContent>
	</Dialog>
</template>
