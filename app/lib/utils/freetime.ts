import { DateTime } from 'luxon';
import { expandSleepWindows, type Interval } from './time';

export interface PartnerSleep {
	start: string;
	end: string;
	zone: string;
}

export interface PartnerInput {
	busy: Interval[];
	sleep: PartnerSleep;
}

export interface FreeTimeParams {
	horizon: Interval;
	a: PartnerInput;
	b: PartnerInput;
	minDurationMinutes: number;
}

export interface FreeWindow extends Interval {
	score: number;
}

export function mergeIntervals(list: Interval[]): Interval[] {
	const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
	if (sorted.length === 0) return [];
	const out: Interval[] = [{ ...sorted[0] }];
	for (let i = 1; i < sorted.length; i++) {
		const last = out[out.length - 1];
		const cur = sorted[i];
		if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
		else out.push({ ...cur });
	}
	return out;
}

function freeWithinHorizon(horizon: Interval, unavailable: Interval[]): Interval[] {
	const free: Interval[] = [];
	let cursor = horizon.start;
	for (const u of unavailable) {
		if (u.end <= horizon.start || u.start >= horizon.end) continue;
		const s = Math.max(u.start, horizon.start);
		if (s > cursor) free.push({ start: cursor, end: s });
		cursor = Math.max(cursor, Math.min(u.end, horizon.end));
	}
	if (cursor < horizon.end) free.push({ start: cursor, end: horizon.end });
	return free;
}

export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
	const res: Interval[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		const start = Math.max(a[i].start, b[j].start);
		const end = Math.min(a[i].end, b[j].end);
		if (start < end) res.push({ start, end });
		if (a[i].end < b[j].end) i++;
		else j++;
	}
	return res;
}

function availabilityFor(partner: PartnerInput, horizon: Interval): Interval[] {
	const sleep = expandSleepWindows(
		partner.sleep.start,
		partner.sleep.end,
		partner.sleep.zone,
		horizon.start,
		horizon.end
	);
	const unavailable = mergeIntervals([...partner.busy, ...sleep]);
	return freeWithinHorizon(horizon, unavailable);
}

function isGolden(window: Interval, zone: string): boolean {
	const mid = (window.start + window.end) / 2;
	const dt = DateTime.fromMillis(mid, { zone });
	const hour = dt.hour + dt.minute / 60;
	return hour >= 8 && hour < 23;
}

export function findMutualFreeTime(params: FreeTimeParams): FreeWindow[] {
	const { horizon, a, b, minDurationMinutes } = params;
	const minMs = minDurationMinutes * 60_000;

	const mutual = intersectIntervals(
		availabilityFor(a, horizon),
		availabilityFor(b, horizon)
	).filter((w) => w.end - w.start >= minMs);

	const scored: FreeWindow[] = mutual.map((w) => ({
		...w,
		score: (isGolden(w, a.sleep.zone) ? 1 : 0) + (isGolden(w, b.sleep.zone) ? 1 : 0)
	}));

	// golden first, then longest, then soonest
	scored.sort(
		(x, y) => y.score - x.score || y.end - y.start - (x.end - x.start) || x.start - y.start
	);
	return scored;
}
