<script setup lang="ts">
import { Heart, LogOut } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';

const supabase = useSupabaseClient();

async function signOut() {
	await supabase.auth.signOut();
	await navigateTo('/login');
}
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<header class="flex items-center justify-between px-5 py-4">
			<NuxtLink to="/" class="flex items-center gap-2 font-display text-xl font-semibold">
				<span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Heart class="size-4" />
				</span>
				UsTime
			</NuxtLink>
			<div class="flex items-center gap-1">
				<ThemeToggle />
				<Button variant="ghost" size="icon" aria-label="Sign out" @click="signOut">
					<LogOut class="size-5" />
				</Button>
			</div>
		</header>

		<main class="flex flex-1 items-center justify-center px-6 py-8">
			<div class="w-full max-w-md">
				<slot />
			</div>
		</main>
	</div>
</template>
