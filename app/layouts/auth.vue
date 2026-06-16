<script setup lang="ts">
import { Heart } from 'lucide-vue-next';
</script>

<template>
	<div class="flex min-h-screen flex-col items-center justify-center px-6 py-12">
		<NuxtLink to="/" class="mb-8 flex items-center gap-2 font-display text-xl font-semibold">
			<span class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Heart class="size-5" />
			</span>
			UsTime
		</NuxtLink>
		<div class="w-full max-w-sm">
			<slot />
		</div>
	</div>
</template>
