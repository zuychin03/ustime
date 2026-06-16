<script setup lang="ts">
import { DateTime } from 'luxon';
import { Trash2 } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { EVENT_TYPE_META } from '~/lib/calendar';
import {
	eventSchema,
	eventTypeValues,
	recurrenceToRrule,
	type eventOwnerValues,
	type recurrenceValues,
	type EventInput
} from '~/lib/schemas/event';
import type { EventRow, EventType } from '~/lib/types';
import type { EventWritePayload } from '~/composables/useEvents';
import { fromWallClock, toDateTime } from '~/lib/utils/time';

const props = defineProps<{
	open: boolean;
	event: EventRow | null;
	draftStart: DateTime | null;
	draftEnd: DateTime | null;
	zone: string;
	myId: string;
	partnerId: string | null;
	myName: string;
	partnerName: string;
	saving?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [boolean];
	submit: [EventWritePayload & { id?: string }];
	delete: [string];
}>();

type OwnerValue = (typeof eventOwnerValues)[number];
type RecurrenceValue = (typeof recurrenceValues)[number];

const title = ref('');
const description = ref('');
const type = ref<EventType>('general');
const owner = ref<OwnerValue>('me');
const startLocal = ref('');
const endLocal = ref('');
const allDay = ref(false);
const colourOverride = ref('');
const location = ref('');
const recurrence = ref<RecurrenceValue>('none');
const recurrenceUntil = ref('');
const error = ref('');

const isEdit = computed(() => !!props.event);

// You can read your partner's personal plan, but only they can change it.
const readOnly = computed(
	() => !!props.event && props.event.owner_id !== null && props.event.owner_id !== props.myId
);
// A per-event colour can only be picked for mutual plans; personal plans always
// use the owner's profile colour (set in Settings).
const canCustomiseColour = computed(() => owner.value === 'shared' && !readOnly.value);

function toInput(iso: string): string {
	return toDateTime(iso).setZone(props.zone).toFormat("yyyy-MM-dd'T'HH:mm");
}

function rruleToRecurrence(rrule: string | null): RecurrenceValue {
	if (!rrule) return 'none';
	if (rrule.includes('FREQ=DAILY')) return 'daily';
	if (rrule.includes('FREQ=WEEKLY')) return 'weekly';
	if (rrule.includes('FREQ=MONTHLY')) return 'monthly';
	return 'none';
}

function ownerFromId(ownerId: string | null): OwnerValue {
	if (ownerId === null) return 'shared';
	return ownerId === props.myId ? 'me' : 'partner';
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		error.value = '';
		const e = props.event;
		if (e) {
			title.value = e.title;
			description.value = e.description ?? '';
			type.value = e.type;
			owner.value = ownerFromId(e.owner_id);
			startLocal.value = toInput(e.starts_at);
			endLocal.value = toInput(e.ends_at);
			allDay.value = e.all_day;
			colourOverride.value = e.colour_override ?? '';
			location.value = e.location ?? '';
			recurrence.value = rruleToRecurrence(e.rrule);
			recurrenceUntil.value = e.rrule_until
				? toDateTime(e.rrule_until).setZone(props.zone).toFormat('yyyy-MM-dd')
				: '';
		} else {
			const start = props.draftStart ?? DateTime.now().setZone(props.zone).startOf('hour');
			const end = props.draftEnd ?? start.plus({ hours: 1 });
			title.value = '';
			description.value = '';
			type.value = 'general';
			owner.value = 'me';
			startLocal.value = start.toFormat("yyyy-MM-dd'T'HH:mm");
			endLocal.value = end.toFormat("yyyy-MM-dd'T'HH:mm");
			allDay.value = false;
			colourOverride.value = '';
			location.value = '';
			recurrence.value = 'none';
			recurrenceUntil.value = '';
		}
	}
);

// Shared-by-default types nudge the owner to "shared" on a fresh create.
watch(type, (t) => {
	if (!isEdit.value && EVENT_TYPE_META[t].sharedByDefault) owner.value = 'shared';
});

function ownerToId(value: OwnerValue): string | null {
	if (value === 'shared') return null;
	if (value === 'partner') return props.partnerId;
	return props.myId;
}

function buildPayload(): EventWritePayload | null {
	const parsed = eventSchema.safeParse({
		title: title.value,
		description: description.value,
		type: type.value,
		owner: owner.value,
		startLocal: startLocal.value,
		endLocal: endLocal.value,
		allDay: allDay.value,
		colourOverride: colourOverride.value,
		location: location.value,
		recurrence: recurrence.value,
		recurrenceUntilLocal: recurrenceUntil.value
	} satisfies Record<keyof EventInput, unknown>);

	if (!parsed.success) {
		error.value = parsed.error.issues[0]?.message ?? 'Please check the form.';
		return null;
	}
	const data = parsed.data;
	const rrule = recurrenceToRrule(data.recurrence);
	const tzid = rrule ? props.zone : null;
	const rruleUntil =
		rrule && data.recurrenceUntilLocal
			? fromWallClock(`${data.recurrenceUntilLocal}T23:59`, props.zone).toISO()
			: null;

	return {
		title: data.title,
		description: data.description ?? null,
		type: data.type,
		owner_id: ownerToId(data.owner),
		starts_at: fromWallClock(data.startLocal, props.zone).toISO()!,
		ends_at: fromWallClock(data.endLocal, props.zone).toISO()!,
		all_day: data.allDay,
		colour_override: data.owner === 'shared' ? (data.colourOverride ?? null) : null,
		rrule,
		rrule_until: rruleUntil,
		tzid,
		location: data.location ?? null,
		visibility: 'full'
	};
}

function onSubmit() {
	error.value = '';
	const payload = buildPayload();
	if (!payload) return;
	emit('submit', props.event ? { ...payload, id: props.event.id } : payload);
}

function onDelete() {
	if (props.event) emit('delete', props.event.id);
}

const selectClass =
	'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
</script>

<template>
	<Dialog :open="open" @update:open="emit('update:open', $event)">
		<DialogContent class="max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="font-display text-xl">
					{{ readOnly ? `${partnerName}'s plan` : isEdit ? 'Edit event' : 'New event' }}
				</DialogTitle>
				<DialogDescription>
					<template v-if="readOnly">
						You can see {{ partnerName }}'s plan, but only they can change it.
					</template>
					<template v-else> Times are in your timezone ({{ zone.replace(/_/g, ' ') }}). </template>
				</DialogDescription>
			</DialogHeader>

			<form class="space-y-4" @submit.prevent="onSubmit">
				<div class="space-y-1.5">
					<Label for="ev-title">Title</Label>
					<Input id="ev-title" v-model="title" :maxlength="120" :disabled="readOnly" required />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="ev-type">Type</Label>
						<select id="ev-type" v-model="type" :class="selectClass" :disabled="readOnly">
							<option v-for="t in eventTypeValues" :key="t" :value="t">
								{{ EVENT_TYPE_META[t].label }}
							</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="ev-owner">Belongs to</Label>
						<select id="ev-owner" v-model="owner" :class="selectClass" :disabled="readOnly">
							<option value="me">{{ myName || 'Me' }}</option>
							<option value="partner">{{ partnerName || 'Partner' }}</option>
							<option value="shared">Both of us</option>
						</select>
					</div>
				</div>

				<div class="flex items-center justify-between rounded-md border px-3 py-2">
					<Label for="ev-allday" class="cursor-pointer">All day</Label>
					<Switch id="ev-allday" v-model="allDay" :disabled="readOnly" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="ev-start">Start</Label>
						<Input
							id="ev-start"
							v-model="startLocal"
							type="datetime-local"
							:disabled="readOnly"
							required
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="ev-end">End</Label>
						<Input
							id="ev-end"
							v-model="endLocal"
							type="datetime-local"
							:disabled="readOnly"
							required
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="ev-recur">Repeats</Label>
						<select id="ev-recur" v-model="recurrence" :class="selectClass" :disabled="readOnly">
							<option value="none">Does not repeat</option>
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
						</select>
					</div>
					<div v-if="recurrence !== 'none'" class="space-y-1.5">
						<Label for="ev-until">Until (optional)</Label>
						<Input id="ev-until" v-model="recurrenceUntil" type="date" :disabled="readOnly" />
					</div>
				</div>

				<div class="space-y-1.5">
					<Label for="ev-location">Location (optional)</Label>
					<Input id="ev-location" v-model="location" :maxlength="200" :disabled="readOnly" />
				</div>

				<div class="space-y-1.5">
					<Label for="ev-desc">Notes (optional)</Label>
					<Textarea
						id="ev-desc"
						v-model="description"
						:maxlength="2000"
						rows="2"
						:disabled="readOnly"
					/>
				</div>

				<!-- Colour: only mutual plans can be recoloured; personal plans follow Settings. -->
				<div v-if="canCustomiseColour" class="flex items-center gap-3">
					<Label for="ev-colour">Custom colour</Label>
					<input
						id="ev-colour"
						v-model="colourOverride"
						type="color"
						class="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
					/>
					<Button
						v-if="colourOverride"
						type="button"
						variant="ghost"
						size="sm"
						@click="colourOverride = ''"
					>
						Reset to blend
					</Button>
				</div>
				<p v-else-if="!readOnly" class="text-xs text-muted-foreground">
					Personal plans use your colour from Settings. Switch “Belongs to” to “Both of us” to pick
					a custom colour.
				</p>

				<p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

				<DialogFooter v-if="readOnly">
					<Button type="button" variant="secondary" @click="emit('update:open', false)">
						Close
					</Button>
				</DialogFooter>
				<DialogFooter v-else class="gap-2 sm:justify-between">
					<Button
						v-if="isEdit"
						type="button"
						variant="ghost"
						class="gap-2 text-destructive hover:text-destructive"
						@click="onDelete"
					>
						<Trash2 class="size-4" /> Delete
					</Button>
					<Button type="submit" :disabled="saving">
						{{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event' }}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
</template>
