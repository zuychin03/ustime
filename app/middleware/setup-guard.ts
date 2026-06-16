export default defineNuxtRouteMiddleware(async () => {
	const user = useSupabaseUser();
	if (!user.value?.sub) return;

	const { ctx, refresh } = useCoupleContext();
	await refresh();

	if (ctx.value.profile?.onboarded_at && ctx.value.isPaired) return navigateTo('/dashboard');
});
