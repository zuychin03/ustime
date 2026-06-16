<script setup lang="ts">
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import WeekGrid from '~/components/calendar/WeekGrid.vue';
import MonthView from '~/components/calendar/MonthView.vue';
import EventDialog from '~/components/calendar/EventDialog.vue';
import FindTimeDialog from '~/components/calendar/FindTimeDialog.vue';
import OverlapDialog from '~/components/calendar/OverlapDialog.vue';
import { expandOccurrences, type Occurrence, type OverlapSegment } from '~/lib/calendar';
import type { EventWritePayload } from '~/composables/useEvents';
import type { EventRow } from '~/lib/types';
import { weekDays } from '~/lib/utils/time';
import type { AxisMode } from '~/composables/useViewerSettings';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Calendar · UsTime' });

const { ctx } = useCoupleContext();
const user = useSupabaseUser();
const { events, createEvent, updateEvent, deleteEvent } = useEvents();
const { axisMode, myZone, partnerZone, viewerZone } = useViewerSettings();

// Keep partner edits + bookings live.
useCoupleChannel();

const myId = computed(() => user.value?.sub ?? '');
const myColour = computed(() => ctx.value?.profile?.colour ?? '#7c3aed');
const partnerColour = computed(() => ctx.value?.partner?.colour ?? '#ec4899');
const myName = computed(() => ctx.value?.profile?.display_name ?? 'Me');
const partnerName = computed(() => ctx.value?.partner?.display_name ?? 'Partner');

const view = ref<'week' | 'month'>('week');
const refDate = ref(DateTime.now().setZone(viewerZone.value));

watch(viewerZone, (zone) => {
	refDate.value = refDate.value.setZone(zone);
});

const days = computed(() => weekDays(refDate.value, viewerZone.value));

const occurrences = computed<Occurrence[]>(() => {
	const from = days.value[0]!.toUTC();
	const to = days.value[0]!.plus({ days: 7 }).toUTC();
	return expandOccurrences({
		events: events.value,
		from,
		to,
		myId: myId.value,
		myColour: myColour.value,
		partnerColour: partnerColour.value
	});
});

const periodLabel = computed(() => {
	if (view.value === 'month') return refDate.value.toFormat('LLLL yyyy');
	const start = days.value[0]!;
	const end = days.value[6]!;
	const sameMonth = start.hasSame(end, 'month');
	return sameMonth
		? `${start.toFormat('LLL d')} – ${end.toFormat('d, yyyy')}`
		: `${start.toFormat('LLL d')} – ${end.toFormat('LLL d')}`;
});

function go(delta: number) {
	const unit = view.value === 'month' ? { months: delta } : { weeks: delta };
	refDate.value = refDate.value.plus(unit);
}
function today() {
	refDate.value = DateTime.now().setZone(viewerZone.value);
}

const axisModes: { value: AxisMode; label: string }[] = [
	{ value: 'mine', label: 'Mine' },
	{ value: 'theirs', label: 'Theirs' },
	{ value: 'both', label: 'Both' }
];

// Event dialog ---------------------------------------------------------------
const dialogOpen = ref(false);
const editing = ref<EventRow | null>(null);
const draftStart = ref<DateTime | null>(null);
const draftEnd = ref<DateTime | null>(null);
const saving = computed(
	() => createEvent.isPending.value || updateEvent.isPending.value || deleteEvent.isPending.value
);

function openCreate(range?: { start: DateTime; end: DateTime }) {
	editing.value = null;
	draftStart.value = range?.start ?? null;
	draftEnd.value = range?.end ?? null;
	dialogOpen.value = true;
}
function openEdit(occ: Occurrence) {
	editing.value = occ.event;
	draftStart.value = null;
	draftEnd.value = null;
	dialogOpen.value = true;
}

async function onSubmit(payload: EventWritePayload & { id?: string }) {
	try {
		if (payload.id) {
			await updateEvent.mutateAsync({ ...payload, id: payload.id });
			toast.success('Event updated');
		} else {
			await createEvent.mutateAsync(payload);
			toast.success('Event created');
		}
		dialogOpen.value = false;
	} catch (e) {
		toast.error(e instanceof Error ? e.message : 'Could not save event');
	}
}

async function onDelete(id: string) {
	try {
		await deleteEvent.mutateAsync(id);
		toast.success('Event deleted');
		dialogOpen.value = false;
	} catch (e) {
		toast.error(e instanceof Error ? e.message : 'Could not delete event');
	}
}

// Overlap (both busy) details ------------------------------------------------
const overlapOpen = ref(false);
const overlapSeg = ref<OverlapSegment | null>(null);
function openOverlap(seg: OverlapSegment) {
	overlapSeg.value = seg;
	overlapOpen.value = true;
}

// Find time ------------------------------------------------------------------
const findOpen = ref(false);

async function onBook(window: { start: DateTime; end: DateTime; type: 'call' | 'study' }) {
	const payload: EventWritePayload = {
		title: window.type === 'call' ? 'Call together' : 'Study together',
		description: null,
		type: window.type,
		owner_id: null,
		starts_at: window.start.toISO()!,
		ends_at: window.end.toISO()!,
		all_day: false,
		colour_override: null,
		rrule: null,
		rrule_until: null,
		tzid: null,
		location: null,
		visibility: 'full'
	};
	try {
		await createEvent.mutateAsync(payload);
		findOpen.value = false;
		toast.success(`${payload.title} scheduled`);
	} catch (e) {
		toast.error(e instanceof Error ? e.message : 'Could not book that time');
	}
}

function goToDay(day: DateTime) {
	refDate.value = day;
	view.value = 'week';
}
</script>

<template>
	<div class="space-y-3">
		<!-- Toolbar -->
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<h1 class="font-display text-lg font-semibold tracking-tight sm:text-2xl">
				{{ periodLabel }}
			</h1>
			<div class="flex items-center gap-1">
				<Button variant="outline" size="icon" aria-label="Previous week" @click="go(-1)">
					<ChevronLeft class="size-4" />
				</Button>
				<Button variant="outline" size="sm" @click="today">Today</Button>
				<Button variant="outline" size="icon" aria-label="Next week" @click="go(1)">
					<ChevronRight class="size-4" />
				</Button>
			</div>

			<div class="ml-auto flex flex-wrap items-center gap-2">
				<!-- View toggle -->
				<div class="inline-flex rounded-md border p-0.5">
					<button
						v-for="v in ['week', 'month'] as const"
						:key="v"
						type="button"
						class="rounded px-3 py-1 text-sm font-medium capitalize transition-colors"
						:class="view === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'"
						@click="view = v"
					>
						{{ v }}
					</button>
				</div>

				<!-- Timezone axis toggle -->
				<div v-if="view === 'week'" class="inline-flex rounded-md border p-0.5">
					<button
						v-for="m in axisModes"
						:key="m.value"
						type="button"
						class="rounded px-2.5 py-1 text-sm font-medium transition-colors"
						:class="
							axisMode === m.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
						"
						@click="axisMode = m.value"
					>
						{{ m.label }}
					</button>
				</div>

				<Button variant="outline" class="gap-1.5" @click="findOpen = true">
					<Sparkles class="size-4" />
					<span class="hidden sm:inline">Find time</span>
				</Button>
			</div>
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
			<span class="flex min-w-0 items-center gap-1.5">
				<span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: myColour }" />
				<span class="truncate">{{ myName }} · {{ myZone.replace(/_/g, ' ') }}</span>
			</span>
			<span class="flex min-w-0 items-center gap-1.5">
				<span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: partnerColour }" />
				<span class="truncate">{{ partnerName }} · {{ partnerZone.replace(/_/g, ' ') }}</span>
			</span>
		</div>

		<WeekGrid
			v-if="view === 'week'"
			:days="days"
			:occurrences="occurrences"
			:events="events"
			:zone="viewerZone"
			:my-zone="myZone"
			:partner-zone="partnerZone"
			:axis-mode="axisMode"
			:my-id="myId"
			:my-colour="myColour"
			:partner-colour="partnerColour"
			@create="openCreate"
			@select="openEdit"
			@select-overlap="openOverlap"
		/>
		<MonthView
			v-else
			:month="refDate"
			:events="events"
			:zone="viewerZone"
			:my-id="myId"
			:my-colour="myColour"
			:partner-colour="partnerColour"
			@select-day="goToDay"
		/>

		<!-- FAB -->
		<Button
			class="fixed right-5 bottom-20 z-20 size-14 rounded-full shadow-lg md:right-8 md:bottom-8"
			aria-label="New event"
			@click="openCreate()"
		>
			<Plus class="size-6" />
		</Button>

		<EventDialog
			v-model:open="dialogOpen"
			:event="editing"
			:draft-start="draftStart"
			:draft-end="draftEnd"
			:zone="viewerZone"
			:my-id="myId"
			:partner-id="ctx?.partner?.id ?? null"
			:my-name="myName"
			:partner-name="partnerName"
			:saving="saving"
			@submit="onSubmit"
			@delete="onDelete"
		/>

		<FindTimeDialog
			v-model:open="findOpen"
			:events="events"
			:me="ctx?.profile ?? null"
			:partner="ctx?.partner ?? null"
			:my-id="myId"
			@book="onBook"
		/>

		<OverlapDialog
			v-model:open="overlapOpen"
			:segment="overlapSeg"
			:my-name="myName"
			:partner-name="partnerName"
			:my-zone="myZone"
			:partner-zone="partnerZone"
			:viewer-zone="viewerZone"
		/>
	</div>
</template>
