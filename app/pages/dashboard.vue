<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { formatInZone } from '~/lib/utils/time';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Dashboard · UsTime' });

const { ctx } = useCoupleContext();
const me = computed(() => ctx.value?.profile ?? null);
const partner = computed(() => ctx.value?.partner ?? null);

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
	timer = setInterval(() => (now.value = Date.now()), 30_000);
});
onUnmounted(() => clearInterval(timer));

const people = computed(() =>
	[me.value, partner.value]
		.filter((p): p is NonNullable<typeof p> => p != null)
		.map((p) => ({
			name: p.display_name,
			colour: p.colour,
			time: formatInZone(now.value, p.timezone, 'ccc HH:mm'),
			zone: p.timezone.replace(/_/g, ' ')
		}))
);
</script>

<template>
	<div class="mx-auto max-w-3xl space-y-6">
		<div>
			<h1 class="font-display text-3xl font-semibold tracking-tight">
				Hi {{ me?.display_name ?? 'there' }}
			</h1>
			<p class="text-muted-foreground">
				<template v-if="partner">You're paired with {{ partner.display_name }}</template>
				<template v-else>Welcome to your shared space.</template>
			</p>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Right now</CardTitle>
				<CardDescription>Where you both are in time.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				<div v-for="person in people" :key="person.name" class="flex items-center gap-3">
					<span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: person.colour }" />
					<span class="font-medium">{{ person.name }}</span>
					<span class="ml-auto text-sm text-muted-foreground">{{ person.zone }}</span>
					<span class="w-24 text-right font-display text-lg font-semibold tabular-nums">
						{{ person.time }}
					</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Your shared calendar</CardTitle>
				<CardDescription>
					Plan calls, study sessions and visits across your timezones.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button as-child class="gap-2">
					<NuxtLink to="/calendar"><CalendarDays class="size-4" /> Open calendar</NuxtLink>
				</Button>
			</CardFooter>
		</Card>
	</div>
</template>
