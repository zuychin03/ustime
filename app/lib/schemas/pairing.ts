import { z } from 'zod';

export const redeemSchema = z.object({
	code: z.string().trim().toLowerCase().min(3, 'Enter the code your partner shared').max(40)
});

export type RedeemInput = z.infer<typeof redeemSchema>;
