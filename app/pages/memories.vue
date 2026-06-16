<script setup lang="ts">
import { Image } from 'lucide-vue-next';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Memories · UsTime' });
</script>

<template>
	<ComingSoon
		:icon="Image"
		title="Memory journal"
		description="After a date or visit, you'll both attach a photo and a note, building a shared timeline of your moments."
		stage="Coming in Stage 2"
	/>
</template>
