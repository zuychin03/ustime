<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Study · UsTime' });
</script>

<template>
	<ComingSoon
		:icon="BookOpen"
		title="Study with me"
		description="A synchronised Pomodoro timer driven by Supabase Realtime, plus your cumulative hours studied together."
		stage="Coming in Stage 1"
	/>
</template>
