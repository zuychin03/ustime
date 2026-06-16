<script setup lang="ts">
import {
	BookOpen,
	CalendarDays,
	Heart,
	Image,
	LayoutDashboard,
	LogOut,
	Settings
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Toaster } from '~/components/ui/sonner';

const route = useRoute();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const { ctx } = useCoupleContext();

// One channel for the whole app shell: surfaces pings as toasts anywhere.
const { on } = useCoupleChannel();
on('ping', () => {
	toast('Thinking of you 💜', {
		description: `${ctx.value?.partner?.display_name ?? 'Your partner'} just sent you a ping`
	});
});

const nav = [
	{ href: '/calendar', label: 'Calendar', icon: CalendarDays },
	{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/study', label: 'Study', icon: BookOpen },
	{ href: '/memories', label: 'Memories', icon: Image },
	{ href: '/settings', label: 'Settings', icon: Settings }
];

function isActive(href: string) {
	return route.path === href || route.path.startsWith(href + '/');
}

async function signOut() {
	await supabase.auth.signOut();
	await navigateTo('/login');
}
</script>

<template>
	<div class="min-h-screen bg-background md:flex">
		<!-- Desktop sidebar -->
		<aside
			class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start overflow-y-auto border-r bg-card md:flex"
		>
			<div class="flex h-16 items-center gap-2 px-5 font-display text-xl font-semibold">
				<span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Heart class="size-4" />
				</span>
				UsTime
			</div>
			<nav class="flex-1 space-y-1 px-3 py-2">
				<NuxtLink
					v-for="item in nav"
					:key="item.href"
					:to="item.href"
					:aria-current="isActive(item.href) ? 'page' : undefined"
					:class="[
						'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
						isActive(item.href)
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
					]"
				>
					<component :is="item.icon" class="size-5" />
					{{ item.label }}
				</NuxtLink>
			</nav>
			<div class="space-y-2 border-t p-3">
				<p class="truncate px-2 text-xs text-muted-foreground">{{ user?.email }}</p>
				<div class="flex items-center justify-between">
					<Button variant="ghost" size="sm" class="gap-2" @click="signOut">
						<LogOut class="size-4" /> Sign out
					</Button>
					<ThemeToggle />
				</div>
			</div>
		</aside>

		<div class="flex min-h-screen flex-1 flex-col">
			<!-- Mobile top bar -->
			<header class="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
				<NuxtLink
					to="/dashboard"
					class="flex items-center gap-2 font-display text-lg font-semibold"
				>
					<span
						class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
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

			<main class="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
				<slot />
			</main>

			<!-- Mobile bottom nav -->
			<nav class="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-card md:hidden">
				<NuxtLink
					v-for="item in nav"
					:key="item.href"
					:to="item.href"
					:aria-current="isActive(item.href) ? 'page' : undefined"
					:class="[
						'flex flex-col items-center gap-1 py-2 text-xs',
						isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
					]"
				>
					<component :is="item.icon" class="size-5" />
					{{ item.label }}
				</NuxtLink>
			</nav>
		</div>

		<Toaster position="top-center" rich-colors />
	</div>
</template>
