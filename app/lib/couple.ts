import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoupleRow, ProfileRow } from '~/lib/types';

export interface CoupleContext {
	profile: ProfileRow | null;
	couple: CoupleRow | null;
	partner: ProfileRow | null;
	isPaired: boolean;
}

export const emptyCoupleContext = (): CoupleContext => ({
	profile: null,
	couple: null,
	partner: null,
	isPaired: false
});

export async function loadCoupleContext(
	supabase: SupabaseClient,
	userId: string
): Promise<CoupleContext> {
	const [profileRes, coupleRes] = await Promise.all([
		supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
		supabase
			.from('couples')
			.select('*')
			.is('unlinked_at', null)
			.or(`member_a.eq.${userId},member_b.eq.${userId}`)
			.maybeSingle()
	]);

	const profile = (profileRes.data as ProfileRow | null) ?? null;
	const couple = (coupleRes.data as CoupleRow | null) ?? null;

	let partner: ProfileRow | null = null;
	if (couple?.member_b) {
		const partnerId = couple.member_a === userId ? couple.member_b : couple.member_a;
		const { data } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();
		partner = (data as ProfileRow | null) ?? null;
	}

	return { profile, couple, partner, isPaired: !!couple?.member_b };
}
