<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
	icon: Component;
	title: string;
	description: string;
	stage: string;
}>();
</script>

<template>
	<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
		<div
			class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
		>
			<component :is="icon" class="size-7" />
		</div>
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">{{ title }}</h2>
			<p class="max-w-sm text-sm text-balance text-muted-foreground">{{ description }}</p>
		</div>
		<span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
			{{ stage }}
		</span>
	</div>
</template>
