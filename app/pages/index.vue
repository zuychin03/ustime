<script setup lang="ts">
import { Heart } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';

const user = useSupabaseUser();

useHead({ title: 'UsTime — a shared calendar for two' });
useSeoMeta({
	description: 'A colour-tagged shared calendar for couples in long-distance relationships.'
});
</script>

<template>
	<main class="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center">
		<div class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
			<Heart class="size-8" />
		</div>

		<div class="max-w-xl space-y-4">
			<h1 class="font-display text-5xl font-semibold tracking-tight sm:text-6xl">UsTime</h1>
			<p class="text-lg text-balance text-muted-foreground">
				A colour-tagged shared calendar for two people in a long-distance relationship. Sync
				schedules across timezones, find mutual free time, and stay close.
			</p>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<template v-if="user">
				<Button as-child size="lg"><NuxtLink to="/dashboard">Open the app</NuxtLink></Button>
			</template>
			<template v-else>
				<Button as-child size="lg"><NuxtLink to="/register">Get started</NuxtLink></Button>
				<Button as-child size="lg" variant="outline">
					<NuxtLink to="/login">Sign in</NuxtLink>
				</Button>
			</template>
		</div>
	</main>
</template>
