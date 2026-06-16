export default defineNuxtRouteMiddleware(async () => {
	const user = useSupabaseUser();
	if (!user.value?.sub) return;

	const { ctx, refresh } = useCoupleContext();
	await refresh();

	if (!ctx.value.profile?.onboarded_at) return navigateTo('/onboarding');
	if (!ctx.value.isPaired) return navigateTo('/pair');
});
