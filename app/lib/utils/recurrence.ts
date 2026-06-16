import { RRule } from 'rrule';
import { DateTime } from 'luxon';
import { toDateTime, type DateInput } from './time';

export interface RecurringEventInput {
	startsAt: DateInput;
	endsAt: DateInput;
	rrule?: string | null;
	rruleUntil?: DateInput | null;
	tzid?: string | null;
}

export interface Occurrence {
	start: DateTime;
	end: DateTime;
}

export interface OccurrenceException {
	originalStart: DateInput;
	cancelled: boolean;
}

function toFakeUtc(dt: DateTime): Date {
	return new Date(Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second));
}

function fromFakeUtc(date: Date, zone: string): DateTime {
	return DateTime.fromObject(
		{
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: date.getUTCHours(),
			minute: date.getUTCMinutes(),
			second: date.getUTCSeconds()
		},
		{ zone }
	);
}

// rrule is timezone-naive, so feed wall-clock numbers as "fake UTC" and
// reinterpret each occurrence in tzid — keeps e.g. "Friday 8pm" local across DST.
export function expandEvent(
	event: RecurringEventInput,
	windowStart: DateInput,
	windowEnd: DateInput,
	exceptions: OccurrenceException[] = []
): Occurrence[] {
	const startUtc = toDateTime(event.startsAt).toUTC();
	const endUtc = toDateTime(event.endsAt).toUTC();
	const winStart = toDateTime(windowStart).toUTC();
	const winEnd = toDateTime(windowEnd).toUTC();
	const durationMs = endUtc.toMillis() - startUtc.toMillis();

	const overlaps = (s: DateTime, e: DateTime) => s < winEnd && e > winStart;

	if (!event.rrule) {
		return overlaps(startUtc, endUtc) ? [{ start: startUtc, end: endUtc }] : [];
	}

	const zone = event.tzid ?? 'UTC';
	const localStart = startUtc.setZone(zone);

	const options = RRule.parseString(event.rrule);
	options.dtstart = toFakeUtc(localStart);
	if (event.rruleUntil) {
		options.until = toFakeUtc(toDateTime(event.rruleUntil).setZone(zone));
	}
	const rule = new RRule(options);

	const after = toFakeUtc(winStart.setZone(zone).minus({ days: 1 }));
	const before = toFakeUtc(winEnd.setZone(zone).plus({ days: 1 }));

	const cancelled = new Set(
		exceptions
			.filter((ex) => ex.cancelled)
			.map((ex) => toDateTime(ex.originalStart).toUTC().toMillis())
	);

	const result: Occurrence[] = [];
	for (const naive of rule.between(after, before, true)) {
		const occStart = fromFakeUtc(naive, zone).toUTC();
		const occEnd = occStart.plus({ milliseconds: durationMs });
		if (!overlaps(occStart, occEnd)) continue;
		if (cancelled.has(occStart.toMillis())) continue;
		result.push({ start: occStart, end: occEnd });
	}
	return result;
}
