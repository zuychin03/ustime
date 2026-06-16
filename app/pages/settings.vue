<script setup lang="ts">
import { Settings } from 'lucide-vue-next';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Settings · UsTime' });
</script>

<template>
	<ComingSoon
		:icon="Settings"
		title="Settings"
		description="Your display name, colour, timezone, and usual sleep hours will live here once onboarding lands."
		stage="Coming in Stage 1"
	/>
</template>
