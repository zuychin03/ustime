import { DateTime } from 'luxon';
import {
	Calendar,
	Phone,
	BookOpen,
	Heart,
	Plane,
	CalendarOff,
	type LucideIcon
} from 'lucide-vue-next';
import type { EventRow, EventType } from '~/lib/types';
import { blend } from '~/lib/utils/blend';
import { expandEvent } from '~/lib/utils/recurrence';

export type OwnerKind = 'me' | 'partner' | 'shared';

export interface EventTypeMeta {
	value: EventType;
	label: string;
	icon: LucideIcon;
	sharedByDefault: boolean;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
	general: { value: 'general', label: 'General', icon: Calendar, sharedByDefault: false },
	call: { value: 'call', label: 'Call', icon: Phone, sharedByDefault: true },
	study: { value: 'study', label: 'Study', icon: BookOpen, sharedByDefault: true },
	date: { value: 'date', label: 'Date', icon: Heart, sharedByDefault: false },
	visit: { value: 'visit', label: 'Visit', icon: Plane, sharedByDefault: false },
	busy_import: { value: 'busy_import', label: 'Busy', icon: CalendarOff, sharedByDefault: false }
};

export interface Occurrence {
	event: EventRow;
	/** Stable key for this specific occurrence (handles recurrence). */
	key: string;
	start: DateTime; // UTC
	end: DateTime; // UTC
	ownerKind: OwnerKind;
	colour: string;
}

export function ownerKindOf(ownerId: string | null, myId: string): OwnerKind {
	if (ownerId === null) return 'shared';
	return ownerId === myId ? 'me' : 'partner';
}

/**
 * Colour for an event: per-event override wins, otherwise the owner's colour,
 * and shared events use the OKLCH blend of both partners (spec §6.2).
 */
export function eventColour(
	event: EventRow,
	ownerKind: OwnerKind,
	myColour: string,
	partnerColour: string
): string {
	if (event.colour_override) return event.colour_override;
	if (ownerKind === 'me') return myColour;
	if (ownerKind === 'partner') return partnerColour;
	return blend(myColour, partnerColour);
}

export interface ExpandParams {
	events: EventRow[];
	from: DateTime;
	to: DateTime;
	myId: string;
	myColour: string;
	partnerColour: string;
}

/**
 * Expand all events (including recurrence) into concrete occurrences that
 * overlap [from, to]. Pure — heavy lifting (rrule, tz) lives in the tested
 * helpers.
 */
export function expandOccurrences(params: ExpandParams): Occurrence[] {
	const { events, from, to, myId, myColour, partnerColour } = params;
	const out: Occurrence[] = [];

	for (const event of events) {
		if (event.all_day) continue; // all-day handled separately in the grid header
		const kind = ownerKindOf(event.owner_id, myId);
		const colour = eventColour(event, kind, myColour, partnerColour);
		const occurrences = expandEvent(
			{
				startsAt: event.starts_at,
				endsAt: event.ends_at,
				rrule: event.rrule,
				rruleUntil: event.rrule_until,
				tzid: event.tzid
			},
			from,
			to
		);
		for (const occ of occurrences) {
			out.push({
				event,
				key: `${event.id}:${occ.start.toMillis()}`,
				start: occ.start,
				end: occ.end,
				ownerKind: kind,
				colour
			});
		}
	}

	return out.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

export interface DaySegment {
	occurrence: Occurrence;
	/** Minutes from midnight in the viewer zone. */
	startMin: number;
	endMin: number;
	/** When clashing, the tile is a "knife": a wide blade over the overlap with a
	 * thin handle below. A non-clashing tile stays a full-width rectangle. */
	knife: boolean;
	/** Minute the blade ends and the thin handle begins (knives only). */
	bladeEndMin: number;
	/** Stacking order (later clashing activities sit above earlier ones). */
	z: number;
}

// Knife geometry (percent of the day column). The blade carries the label; the
// handle is the thin stick spanning the rest of the activity.
export const BLADE_WIDTH_PCT = 80;
export const HANDLE_WIDTH_PCT = 13;

interface Clip {
	occurrence: Occurrence;
	startMin: number;
	endMin: number;
}

const DAY_MINUTES = 24 * 60;

/** Clip an occurrence to a single day column (viewer zone) → minutes range. */
function clipToDay(occ: Occurrence, dayStart: DateTime, zone: string): Clip | null {
	const dayEnd = dayStart.plus({ days: 1 });
	const s = occ.start.setZone(zone);
	const e = occ.end.setZone(zone);
	if (e <= dayStart || s >= dayEnd) return null;
	const clampedStart = s < dayStart ? dayStart : s;
	const clampedEnd = e > dayEnd ? dayEnd : e;
	const startMin = clampedStart.diff(dayStart, 'minutes').minutes;
	const endMin = clampedEnd.diff(dayStart, 'minutes').minutes;
	return {
		occurrence: occ,
		startMin: Math.max(0, Math.min(DAY_MINUTES, startMin)),
		endMin: Math.max(0, Math.min(DAY_MINUTES, endMin))
	};
}

function overlaps(a: Clip, b: Clip): boolean {
	return a.startMin < b.endMin && b.startMin < a.endMin;
}

export interface OverlapSegment {
	/** The overlap region, in minutes from midnight (viewer zone). */
	start: number;
	end: number;
	/** OKLCH blend of the two clashing activities (full-width band behind the blade). */
	colour: string;
	/** Both activities, for the "you're both busy" dialog (mine first). */
	mine: Occurrence;
	theirs: Occurrence;
	titles: [string, string];
	/** Stacking order: behind its own blade, above the earlier activity. */
	z: number;
}

export interface DayLayout {
	/** Coloured tiles — full-width rectangles or knives. */
	tiles: DaySegment[];
	/** Full-width blend bands sitting behind each clash's blade. */
	flags: OverlapSegment[];
}

/** End of the first (earliest, merged) clash region for `clip` — where its blade
 * ends and the thin handle begins. Returns -1 when `clip` clashes with nobody. */
function firstClashEnd(clip: Clip, clips: Clip[]): number {
	const regions: Array<[number, number]> = [];
	for (const other of clips) {
		if (other === clip) continue;
		const s = Math.max(clip.startMin, other.startMin);
		const e = Math.min(clip.endMin, other.endMin);
		if (s < e) regions.push([s, e]);
	}
	if (regions.length === 0) return -1;
	regions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let end = regions[0]![1];
	for (let k = 1; k < regions.length; k++) {
		if (regions[k]![0] <= end) end = Math.max(end, regions[k]![1]);
		else break; // a gap → the first clash is done; the rest is handle
	}
	return end;
}

/**
 * Lay out one day. Activities are taken in start order. One that overlaps nobody
 * is a plain full-width rectangle. One that clashes with another becomes a knife
 * — a wide blade across its first clash (carrying its label) tapering to a thin
 * handle for the rest; the earliest of a clash simply has no handle. Behind each
 * clash sits a full-width blend band. Later activities stack above earlier ones.
 */
export function layoutDay(occurrences: Occurrence[], dayStart: DateTime, zone: string): DayLayout {
	const clips: Clip[] = [];
	for (const occ of occurrences) {
		const clip = clipToDay(occ, dayStart, zone);
		if (clip) clips.push(clip);
	}
	clips.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

	const tiles: DaySegment[] = [];
	const flags: OverlapSegment[] = [];
	const ranks: number[] = [];
	for (let i = 0; i < clips.length; i++) {
		const clip = clips[i]!;
		// Stack above every earlier activity this one clashes with; each such pair
		// gets a full-width blend band behind this (later) activity's blade.
		let rank = 0;
		const earlier: Clip[] = [];
		for (let j = 0; j < i; j++) {
			if (overlaps(clips[j]!, clip)) {
				rank = Math.max(rank, ranks[j]! + 1);
				earlier.push(clips[j]!);
			}
		}
		ranks.push(rank);
		const z = 10 + rank * 2;

		const clashEnd = firstClashEnd(clip, clips);
		tiles.push({
			...clip,
			knife: clashEnd >= 0,
			bladeEndMin: clashEnd >= 0 ? clashEnd : clip.endMin,
			z: z + 1
		});

		const later = clip.occurrence;
		for (const before of earlier) {
			const beforeOcc = before.occurrence;
			const mine = beforeOcc.ownerKind === 'me' ? beforeOcc : later;
			const theirs = mine === beforeOcc ? later : beforeOcc;
			flags.push({
				start: clip.startMin,
				end: Math.min(clip.endMin, before.endMin),
				colour: blend(later.colour, beforeOcc.colour),
				mine,
				theirs,
				titles: [mine.event.title, theirs.event.title],
				z
			});
		}
	}
	return { tiles, flags };
}

export interface AllDayChip {
	event: EventRow;
	colour: string;
	ownerKind: OwnerKind;
}

/** All-day events whose date span (in the viewer zone) covers this day. */
export function allDayForDay(
	events: EventRow[],
	dayStart: DateTime,
	zone: string,
	myId: string,
	myColour: string,
	partnerColour: string
): AllDayChip[] {
	const out: AllDayChip[] = [];
	for (const event of events) {
		if (!event.all_day) continue;
		const start = DateTime.fromISO(event.starts_at, { zone }).startOf('day');
		const end = DateTime.fromISO(event.ends_at, { zone }).startOf('day');
		if (dayStart >= start && dayStart <= end) {
			const kind = ownerKindOf(event.owner_id, myId);
			out.push({
				event,
				ownerKind: kind,
				colour: eventColour(event, kind, myColour, partnerColour)
			});
		}
	}
	return out;
}
