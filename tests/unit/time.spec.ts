import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
	expandSleepWindows,
	formatBoth,
	fromWallClock,
	minutesSinceMidnight
} from '~/lib/utils/time';

const MELB = 'Australia/Melbourne';
const BERLIN = 'Europe/Berlin';
const HOUR = 3_600_000;

/** UTC ISO → epoch ms. */
const ms = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' }).toMillis();

describe('fromWallClock', () => {
	it('interprets wall time in Melbourne winter (AEST, UTC+10)', () => {
		expect(fromWallClock('2026-06-19T20:00', MELB).toISO()).toBe('2026-06-19T10:00:00.000Z');
	});

	it('interprets wall time in Melbourne summer (AEDT, UTC+11)', () => {
		expect(fromWallClock('2026-01-19T20:00', MELB).toISO()).toBe('2026-01-19T09:00:00.000Z');
	});

	it('interprets wall time in Berlin summer (CEST, UTC+2)', () => {
		expect(fromWallClock('2026-06-19T20:00', BERLIN).toISO()).toBe('2026-06-19T18:00:00.000Z');
	});

	it('interprets wall time in Berlin winter (CET, UTC+1)', () => {
		expect(fromWallClock('2026-01-19T20:00', BERLIN).toISO()).toBe('2026-01-19T19:00:00.000Z');
	});
});

describe('formatBoth', () => {
	it('renders the same instant in both zones', () => {
		// 2026-06-19 is a Friday. 10:00Z → 20:00 Melbourne, 12:00 Berlin.
		const out = formatBoth('2026-06-19T10:00:00Z', MELB, BERLIN);
		expect(out).toMatch(/^Fri 20:00 .+ · Fri 12:00 .+$/);
	});
});

describe('minutesSinceMidnight', () => {
	it('is viewer-relative', () => {
		expect(minutesSinceMidnight('2026-06-19T10:00:00Z', MELB)).toBe(20 * 60);
		expect(minutesSinceMidnight('2026-06-19T10:00:00Z', BERLIN)).toBe(12 * 60);
	});
});

describe('expandSleepWindows', () => {
	it('expands a midnight-crossing window into nightly intervals', () => {
		const out = expandSleepWindows(
			'23:00',
			'07:00',
			BERLIN,
			ms('2026-06-15T00:00:00Z'),
			ms('2026-06-17T00:00:00Z')
		);
		expect(out).toHaveLength(3);
		// 23:00 CEST (UTC+2) → 21:00Z; 07:00 next day → 05:00Z.
		expect(out[0]).toEqual({
			start: ms('2026-06-14T21:00:00Z'),
			end: ms('2026-06-15T05:00:00Z')
		});
		for (const w of out) expect(w.end - w.start).toBe(8 * HOUR);
	});

	it('handles a same-day (non-wrapping) window', () => {
		const out = expandSleepWindows(
			'01:00',
			'09:00',
			BERLIN,
			ms('2026-06-15T00:00:00Z'),
			ms('2026-06-16T00:00:00Z')
		);
		for (const w of out) expect(w.end - w.start).toBe(8 * HOUR);
		// 01:00 CEST → 23:00Z previous day.
		expect(out).toContainEqual({
			start: ms('2026-06-14T23:00:00Z'),
			end: ms('2026-06-15T07:00:00Z')
		});
	});

	it('loses an hour across the Berlin spring-forward (CET→CEST)', () => {
		// Night of 2026-03-28→29; clocks jump 02:00→03:00 on the 29th.
		const out = expandSleepWindows(
			'23:00',
			'07:00',
			BERLIN,
			ms('2026-03-28T00:00:00Z'),
			ms('2026-03-30T00:00:00Z')
		);
		const night = out.find((w) => w.start === ms('2026-03-28T22:00:00Z'));
		expect(night).toBeDefined();
		expect(night!.end).toBe(ms('2026-03-29T05:00:00Z'));
		expect(night!.end - night!.start).toBe(7 * HOUR);
	});

	it('gains an hour across the Melbourne fall-back (AEDT→AEST)', () => {
		// Night of 2026-04-04→05; clocks fall 03:00→02:00 on the 5th.
		const out = expandSleepWindows(
			'23:00',
			'07:00',
			MELB,
			ms('2026-04-04T00:00:00Z'),
			ms('2026-04-06T00:00:00Z')
		);
		const night = out.find((w) => w.start === ms('2026-04-04T12:00:00Z'));
		expect(night).toBeDefined();
		expect(night!.end).toBe(ms('2026-04-04T21:00:00Z'));
		expect(night!.end - night!.start).toBe(9 * HOUR);
	});
});
