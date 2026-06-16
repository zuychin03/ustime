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
import type { Interval } from '~/lib/utils/time';

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
	/** Lane packing for side-by-side overlapping events. */
	lane: number;
	lanes: number;
}

const DAY_MINUTES = 24 * 60;

/** Clip an occurrence to a single day column (viewer zone) → minutes range. */
function clipToDay(occ: Occurrence, dayStart: DateTime, zone: string): DaySegment | null {
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
		endMin: Math.max(0, Math.min(DAY_MINUTES, endMin)),
		lane: 0,
		lanes: 1
	};
}

/** Greedy lane packing so overlapping events sit side by side. */
function packLanes(segments: DaySegment[]): DaySegment[] {
	const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
	const laneEnds: number[] = [];
	for (const seg of sorted) {
		let placed = false;
		for (let i = 0; i < laneEnds.length; i++) {
			if (seg.startMin >= laneEnds[i]!) {
				seg.lane = i;
				laneEnds[i] = seg.endMin;
				placed = true;
				break;
			}
		}
		if (!placed) {
			seg.lane = laneEnds.length;
			laneEnds.push(seg.endMin);
		}
	}
	// Resolve total lanes per overlapping cluster.
	for (const seg of sorted) {
		let lanes = 1;
		for (const other of sorted) {
			if (other === seg) continue;
			if (seg.startMin < other.endMin && other.startMin < seg.endMin) {
				lanes = Math.max(lanes, other.lane + 1);
			}
		}
		seg.lanes = Math.max(seg.lane + 1, lanes);
	}
	return sorted;
}

export function daySegments(
	occurrences: Occurrence[],
	dayStart: DateTime,
	zone: string
): DaySegment[] {
	const groups: Record<OwnerKind, DaySegment[]> = { me: [], partner: [], shared: [] };
	for (const occ of occurrences) {
		const seg = clipToDay(occ, dayStart, zone);
		if (seg) groups[occ.ownerKind].push(seg);
	}
	// Pack lanes within each owner, so my plans and my partner's plans both keep
	// full width; their intersection is drawn as the blended overlap band.
	return [...packLanes(groups.me), ...packLanes(groups.partner), ...packLanes(groups.shared)];
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

export interface OverlapSegment extends Interval {
	colour: string;
	titles: [string, string];
	/** The two overlapping occurrences (mine first, partner's second). */
	mine: Occurrence;
	theirs: Occurrence;
	/** Titles of activities the band covers entirely (their own tile is hidden,
	 * so the band shows the label on their behalf). */
	coveredTitles: string[];
}

const COVER_EPS = 0.5;

/** Merge intersecting time ranges between mine and partner segments. */
export function overlapSegments(
	mine: DaySegment[],
	theirs: DaySegment[],
	myColour: string,
	partnerColour: string
): OverlapSegment[] {
	const blended = blend(myColour, partnerColour);
	const out: OverlapSegment[] = [];
	for (const a of mine) {
		for (const b of theirs) {
			const start = Math.max(a.startMin, b.startMin);
			const end = Math.min(a.endMin, b.endMin);
			if (start < end) {
				const coveredTitles: string[] = [];
				if (start - a.startMin < COVER_EPS && a.endMin - end < COVER_EPS) {
					coveredTitles.push(a.occurrence.event.title);
				}
				if (start - b.startMin < COVER_EPS && b.endMin - end < COVER_EPS) {
					coveredTitles.push(b.occurrence.event.title);
				}
				out.push({
					start,
					end,
					colour: blended,
					titles: [a.occurrence.event.title, b.occurrence.event.title],
					mine: a.occurrence,
					theirs: b.occurrence,
					coveredTitles
				});
			}
		}
	}
	return out;
}

export type LabelAnchor = 'top' | 'bottom';

/**
 * Where a tile's label should sit. If an overlap band hides the top of the tile
 * (but not all of it), move the label to the still-visible bottom. A fully
 * covered tile keeps its label on top, since its band is drawn translucent.
 */
export function labelAnchor(seg: DaySegment, overlaps: OverlapSegment[]): LabelAnchor {
	let topCovered = false;
	let fullyCovered = false;
	for (const ov of overlaps) {
		if (ov.start <= seg.startMin + COVER_EPS && ov.end > seg.startMin + COVER_EPS) {
			topCovered = true;
		}
		if (ov.start <= seg.startMin + COVER_EPS && ov.end >= seg.endMin - COVER_EPS) {
			fullyCovered = true;
		}
	}
	return topCovered && !fullyCovered ? 'bottom' : 'top';
}
