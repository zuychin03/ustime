import { describe, expect, it } from 'vitest';
import { expandEvent } from '~/lib/utils/recurrence';
import { fromWallClock } from '~/lib/utils/time';

const MELB = 'Australia/Melbourne';

describe('expandEvent — non-recurring', () => {
	const event = {
		startsAt: '2026-06-19T10:00:00Z',
		endsAt: '2026-06-19T11:00:00Z'
	};

	it('returns the single occurrence when it overlaps the window', () => {
		const out = expandEvent(event, '2026-06-19T00:00:00Z', '2026-06-20T00:00:00Z');
		expect(out).toHaveLength(1);
		expect(out[0].start.toISO()).toBe('2026-06-19T10:00:00.000Z');
	});

	it('returns nothing when outside the window', () => {
		expect(expandEvent(event, '2026-06-20T00:00:00Z', '2026-06-21T00:00:00Z')).toHaveLength(0);
	});
});

describe('expandEvent — weekly across a DST boundary', () => {
	// "Every Friday 8pm Melbourne", authored in winter (AEST, UTC+10).
	const event = {
		startsAt: fromWallClock('2026-09-25T20:00', MELB),
		endsAt: fromWallClock('2026-09-25T21:00', MELB),
		rrule: 'FREQ=WEEKLY;BYDAY=FR',
		tzid: MELB
	};

	const out = expandEvent(
		event,
		fromWallClock('2026-09-24T00:00', MELB),
		fromWallClock('2026-10-18T00:00', MELB)
	);

	it('produces one occurrence per week', () => {
		// Sep 25, Oct 2, Oct 9, Oct 16 (Melbourne DST starts Oct 4).
		expect(out).toHaveLength(4);
	});

	it('keeps every occurrence at 8pm local time', () => {
		for (const occ of out) {
			const local = occ.start.setZone(MELB);
			expect(local.hour).toBe(20);
			expect(local.minute).toBe(0);
			expect(local.weekday).toBe(5); // Friday
		}
	});

	it('floats the UTC offset across the DST transition', () => {
		// Before Oct 4: AEST (+10) → 10:00Z. After: AEDT (+11) → 09:00Z.
		expect(out[0].start.toUTC().hour).toBe(10); // Sep 25
		expect(out[1].start.toUTC().hour).toBe(10); // Oct 2
		expect(out[2].start.toUTC().hour).toBe(9); // Oct 9
		expect(out[3].start.toUTC().hour).toBe(9); // Oct 16
	});
});

describe('expandEvent — exceptions and until', () => {
	const base = {
		startsAt: fromWallClock('2026-09-25T20:00', MELB),
		endsAt: fromWallClock('2026-09-25T21:00', MELB),
		rrule: 'FREQ=WEEKLY;BYDAY=FR',
		tzid: MELB
	};
	const from = fromWallClock('2026-09-24T00:00', MELB);
	const to = fromWallClock('2026-10-18T00:00', MELB);

	it('removes cancelled occurrences', () => {
		const out = expandEvent(base, from, to, [
			{ originalStart: fromWallClock('2026-10-02T20:00', MELB), cancelled: true }
		]);
		expect(out).toHaveLength(3);
		expect(out.some((o) => o.start.setZone(MELB).day === 2)).toBe(false);
	});

	it('respects rruleUntil', () => {
		const out = expandEvent(
			{ ...base, rruleUntil: fromWallClock('2026-10-05T00:00', MELB) },
			from,
			to
		);
		expect(out).toHaveLength(2); // Sep 25 and Oct 2 only
	});
});

describe('expandEvent — daily', () => {
	it('counts inclusive daily occurrences', () => {
		const out = expandEvent(
			{
				startsAt: '2026-06-01T09:00:00Z',
				endsAt: '2026-06-01T09:30:00Z',
				rrule: 'FREQ=DAILY',
				tzid: 'UTC'
			},
			'2026-06-01T00:00:00Z',
			'2026-06-05T00:00:00Z'
		);
		// Jun 1, 2, 3, 4
		expect(out).toHaveLength(4);
	});
});
