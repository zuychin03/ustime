<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: 'Signing in… · UsTime' });

const user = useSupabaseUser();
const route = useRoute();

watchEffect(() => {
	if (user.value) {
		const next = typeof route.query.next === 'string' ? route.query.next : '/dashboard';
		navigateTo(next.startsWith('/') ? next : '/dashboard');
	}
});
</script>

<template>
	<div class="grid min-h-screen place-items-center text-muted-foreground">Signing you in…</div>
</template>
