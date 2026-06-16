<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Calendar · UsTime' });
</script>

<template>
	<ComingSoon
		:icon="CalendarDays"
		title="Your shared calendar"
		description="The custom week grid with colour-blended overlaps and dual-timezone display is the heart of UsTime."
		stage="Coming in Stage 1"
	/>
</template>
