import { z } from 'zod';
import { HEX_COLOUR } from './profile';

export const eventTypeValues = ['general', 'call', 'study', 'date', 'visit'] as const;
export const eventOwnerValues = ['me', 'partner', 'shared'] as const;
export const recurrenceValues = ['none', 'daily', 'weekly', 'monthly'] as const;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((v) => v || undefined);

export const eventSchema = z
	.object({
		title: z.string().trim().min(1, 'Give it a title').max(120),
		description: optionalText(2000),
		type: z.enum(eventTypeValues),
		owner: z.enum(eventOwnerValues),
		startLocal: z.string().min(1, 'Pick a start time'),
		endLocal: z.string().min(1, 'Pick an end time'),
		allDay: z.boolean().default(false),
		colourOverride: z
			.string()
			.regex(HEX_COLOUR)
			.optional()
			.or(z.literal(''))
			.transform((v) => v || undefined),
		location: optionalText(200),
		recurrence: z.enum(recurrenceValues).default('none'),
		recurrenceUntilLocal: z
			.string()
			.optional()
			.transform((v) => v || undefined)
	})
	.refine((v) => v.endLocal > v.startLocal, {
		message: 'End must be after start',
		path: ['endLocal']
	});

export type EventInput = z.infer<typeof eventSchema>;

export function recurrenceToRrule(recurrence: (typeof recurrenceValues)[number]): string | null {
	switch (recurrence) {
		case 'daily':
			return 'FREQ=DAILY';
		case 'weekly':
			return 'FREQ=WEEKLY';
		case 'monthly':
			return 'FREQ=MONTHLY';
		default:
			return null;
	}
}
