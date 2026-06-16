import { DateTime } from 'luxon';

export interface Interval {
	start: number;
	end: number;
}

export type DateInput = DateTime | string | number | Date;

export function toDateTime(input: DateInput): DateTime {
	if (input instanceof DateTime) return input;
	if (typeof input === 'number') return DateTime.fromMillis(input, { zone: 'utc' });
	if (input instanceof Date) return DateTime.fromJSDate(input);
	return DateTime.fromISO(input, { setZone: true });
}

export function nowUtc(): DateTime {
	return DateTime.utc();
}

export function fromWallClock(localISO: string, zone: string): DateTime {
	return DateTime.fromISO(localISO, { zone }).toUTC();
}

export function formatInZone(input: DateInput, zone: string, fmt = 'ccc HH:mm ZZZZ'): string {
	return toDateTime(input).setZone(zone).toFormat(fmt);
}

export function formatBoth(input: DateInput, tzA: string, tzB: string): string {
	return `${formatInZone(input, tzA)} · ${formatInZone(input, tzB)}`;
}

export function formatRangeBoth(
	start: DateInput,
	end: DateInput,
	tzA: string,
	tzB: string
): string {
	const part = (zone: string) =>
		`${formatInZone(start, zone, 'ccc HH:mm')}–${formatInZone(end, zone, 'HH:mm ZZZZ')}`;
	return `${part(tzA)} · ${part(tzB)}`;
}

export function timeStringToMinutes(value: string): number {
	const [h, m] = value.split(':');
	return Number(h) * 60 + Number(m);
}

export function expandSleepWindows(
	sleepStart: string,
	sleepEnd: string,
	zone: string,
	fromMs: number,
	toMs: number
): Interval[] {
	const startMin = timeStringToMinutes(sleepStart);
	const endMin = timeStringToMinutes(sleepEnd);
	const [sh, sm] = [Math.floor(startMin / 60), startMin % 60];
	const [eh, em] = [Math.floor(endMin / 60), endMin % 60];
	const wraps = endMin <= startMin; // crosses midnight into the next day

	const intervals: Interval[] = [];
	let day = DateTime.fromMillis(fromMs, { zone }).startOf('day').minus({ days: 1 });
	const lastDay = DateTime.fromMillis(toMs, { zone }).startOf('day').plus({ days: 1 });

	while (day <= lastDay) {
		const start = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
		const endDay = wraps ? day.plus({ days: 1 }) : day;
		const end = endDay.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
		const s = start.toMillis();
		const e = end.toMillis();
		if (e > fromMs && s < toMs) intervals.push({ start: s, end: e });
		day = day.plus({ days: 1 });
	}
	return intervals;
}

export function minutesSinceMidnight(input: DateInput, zone: string): number {
	const dt = toDateTime(input).setZone(zone);
	return dt.hour * 60 + dt.minute + dt.second / 60;
}

export function isValidTimeZone(tz: string): boolean {
	if (!tz) return false;
	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

export function startOfWeek(input: DateInput, zone: string): DateTime {
	return toDateTime(input).setZone(zone).startOf('week').toUTC();
}

export function weekDays(input: DateInput, zone: string): DateTime[] {
	const start = toDateTime(input).setZone(zone).startOf('week');
	return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }));
}
