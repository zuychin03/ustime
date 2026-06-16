import { loadCoupleContext, emptyCoupleContext, type CoupleContext } from '~/lib/couple';

export function useCoupleContext() {
	const ctx = useState<CoupleContext>('couple-context', emptyCoupleContext);
	const supabase = useSupabaseClient();
	const user = useSupabaseUser();

	async function refresh() {
		const userId = user.value?.sub;
		ctx.value = userId ? await loadCoupleContext(supabase, userId) : emptyCoupleContext();
	}

	return { ctx, refresh };
}
