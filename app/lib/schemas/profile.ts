import { z } from 'zod';
import { isValidTimeZone } from '~/lib/utils/time';

export const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const profileStatusValues = ['free', 'studying', 'in_class', 'sleeping'] as const;

export const profileSchema = z.object({
	displayName: z.string().trim().min(1, 'Please enter a display name').max(50),
	colour: z.string().regex(HEX_COLOUR, 'Pick a colour'),
	timezone: z.string().refine(isValidTimeZone, 'Unknown timezone'),
	sleepStart: z.string().regex(TIME_HHMM, 'Use HH:MM'),
	sleepEnd: z.string().regex(TIME_HHMM, 'Use HH:MM')
});

export type ProfileInput = z.infer<typeof profileSchema>;
