import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
	findMutualFreeTime,
	intersectIntervals,
	mergeIntervals,
	type PartnerInput
} from '~/lib/utils/freetime';

const ms = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' }).toMillis();
const sleep2307 = (zone: string) => ({ start: '23:00', end: '07:00', zone });

describe('mergeIntervals', () => {
	it('coalesces overlapping and touching intervals', () => {
		const out = mergeIntervals([
			{ start: 10, end: 20 },
			{ start: 20, end: 30 }, // touching
			{ start: 25, end: 28 }, // contained
			{ start: 40, end: 50 }
		]);
		expect(out).toEqual([
			{ start: 10, end: 30 },
			{ start: 40, end: 50 }
		]);
	});
});

describe('intersectIntervals', () => {
	it('returns only the overlapping spans', () => {
		const a = [
			{ start: 0, end: 10 },
			{ start: 20, end: 30 }
		];
		const b = [{ start: 5, end: 25 }];
		expect(intersectIntervals(a, b)).toEqual([
			{ start: 5, end: 10 },
			{ start: 20, end: 25 }
		]);
	});
});

describe('findMutualFreeTime', () => {
	const horizon = { start: ms('2026-06-15T00:00:00Z'), end: ms('2026-06-16T00:00:00Z') };

	it('with empty calendars, free time is the waking day minus sleep', () => {
		const a: PartnerInput = { busy: [], sleep: sleep2307('UTC') };
		const b: PartnerInput = { busy: [], sleep: sleep2307('UTC') };
		const out = findMutualFreeTime({ horizon, a, b, minDurationMinutes: 60 });
		expect(out).toHaveLength(1);
		expect(out[0].start).toBe(ms('2026-06-15T07:00:00Z'));
		expect(out[0].end).toBe(ms('2026-06-15T23:00:00Z'));
		expect(out[0].score).toBe(2); // golden for both
	});

	it('returns nothing when one partner is busy all horizon', () => {
		const a: PartnerInput = { busy: [{ ...horizon }], sleep: sleep2307('UTC') };
		const b: PartnerInput = { busy: [], sleep: sleep2307('UTC') };
		expect(findMutualFreeTime({ horizon, a, b, minDurationMinutes: 30 })).toHaveLength(0);
	});

	it('excludes windows shorter than the minimum duration', () => {
		// Both free 07:00–23:00; A is busy except a 45-min gap 12:00–12:45.
		const a: PartnerInput = {
			busy: [
				{ start: ms('2026-06-15T07:00:00Z'), end: ms('2026-06-15T12:00:00Z') },
				{ start: ms('2026-06-15T12:45:00Z'), end: ms('2026-06-15T23:00:00Z') }
			],
			sleep: sleep2307('UTC')
		};
		const b: PartnerInput = { busy: [], sleep: sleep2307('UTC') };

		expect(findMutualFreeTime({ horizon, a, b, minDurationMinutes: 60 })).toHaveLength(0);
		const ok = findMutualFreeTime({ horizon, a, b, minDurationMinutes: 30 });
		expect(ok).toHaveLength(1);
		expect(ok[0]).toMatchObject({
			start: ms('2026-06-15T12:00:00Z'),
			end: ms('2026-06-15T12:45:00Z')
		});
	});

	it('accounts for different timezones and sleep windows', () => {
		// A in Melbourne (UTC+10 June), B in Berlin (UTC+2 June). Both sleep 23–07
		// local. The mutual waking overlap is the slice where both are awake.
		const a: PartnerInput = { busy: [], sleep: sleep2307('Australia/Melbourne') };
		const b: PartnerInput = { busy: [], sleep: sleep2307('Europe/Berlin') };
		const wide = { start: ms('2026-06-15T00:00:00Z'), end: ms('2026-06-17T00:00:00Z') };
		const out = findMutualFreeTime({ horizon: wide, a, b, minDurationMinutes: 60 });
		expect(out.length).toBeGreaterThan(0);
		// Every returned window must be inside both partners' waking hours.
		for (const w of out) {
			const aMid = DateTime.fromMillis((w.start + w.end) / 2, { zone: 'Australia/Melbourne' });
			const bMid = DateTime.fromMillis((w.start + w.end) / 2, { zone: 'Europe/Berlin' });
			expect(aMid.hour).toBeGreaterThanOrEqual(7);
			expect(bMid.hour).toBeGreaterThanOrEqual(7);
		}
	});

	it('ranks the longer golden window first when scores tie', () => {
		// A is busy 12:00–13:00, splitting the waking day into a 5h and a 10h window.
		const a: PartnerInput = {
			busy: [{ start: ms('2026-06-15T12:00:00Z'), end: ms('2026-06-15T13:00:00Z') }],
			sleep: sleep2307('UTC')
		};
		const b: PartnerInput = { busy: [], sleep: sleep2307('UTC') };
		const out = findMutualFreeTime({ horizon, a, b, minDurationMinutes: 30 });
		expect(out).toHaveLength(2);
		// 13:00–23:00 (10h) before 07:00–12:00 (5h); both golden.
		expect(out[0]).toMatchObject({
			start: ms('2026-06-15T13:00:00Z'),
			end: ms('2026-06-15T23:00:00Z'),
			score: 2
		});
		expect(out[1]).toMatchObject({
			start: ms('2026-06-15T07:00:00Z'),
			end: ms('2026-06-15T12:00:00Z')
		});
	});
});
