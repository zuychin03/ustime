<script setup lang="ts">
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { profileSchema } from '~/lib/schemas/profile';

definePageMeta({ layout: 'app', middleware: 'app-guard' });
useHead({ title: 'Settings · UsTime' });

const supabase = useSupabaseClient() as unknown as SupabaseClient;
const user = useSupabaseUser();
const { ctx, refresh } = useCoupleContext();
const profile = computed(() => ctx.value?.profile ?? null);

const timezones: string[] =
	typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

const displayName = ref(profile.value?.display_name ?? '');
const colour = ref(profile.value?.colour ?? '#7c3aed');
const timezone = ref(profile.value?.timezone ?? 'UTC');
const sleepStart = ref((profile.value?.sleep_start ?? '23:00:00').slice(0, 5));
const sleepEnd = ref((profile.value?.sleep_end ?? '07:00:00').slice(0, 5));
const error = ref('');
const submitting = ref(false);

async function onSubmit() {
	error.value = '';
	const parsed = profileSchema.safeParse({
		displayName: displayName.value,
		colour: colour.value,
		timezone: timezone.value,
		sleepStart: sleepStart.value,
		sleepEnd: sleepEnd.value
	});
	if (!parsed.success) {
		error.value = parsed.error.issues[0]?.message ?? 'Please check the form.';
		return;
	}

	const userId = user.value?.sub;
	if (!userId) {
		error.value = 'Your session expired. Please sign in again.';
		return;
	}

	submitting.value = true;
	const { error: e } = await supabase
		.from('profiles')
		.update({
			display_name: parsed.data.displayName,
			colour: parsed.data.colour,
			timezone: parsed.data.timezone,
			sleep_start: parsed.data.sleepStart,
			sleep_end: parsed.data.sleepEnd
		})
		.eq('id', userId);
	submitting.value = false;

	if (e) {
		error.value = e.message;
		return;
	}
	await refresh();
	toast.success('Profile updated');
}
</script>

<template>
	<div class="mx-auto max-w-xl space-y-6">
		<h1 class="font-display text-3xl font-semibold tracking-tight">Settings</h1>

		<Card>
			<CardHeader>
				<CardTitle>Your profile</CardTitle>
				<CardDescription>How you appear to your partner across timezones.</CardDescription>
			</CardHeader>
			<CardContent>
				<form class="space-y-5" @submit.prevent="onSubmit">
					<div class="space-y-2">
						<Label for="displayName">Display name</Label>
						<Input id="displayName" v-model="displayName" required :maxlength="50" />
					</div>

					<div class="space-y-2">
						<Label for="colour">Your colour</Label>
						<div class="flex items-center gap-3">
							<input
								id="colour"
								v-model="colour"
								type="color"
								class="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
							/>
							<span class="font-mono text-sm text-muted-foreground">{{ colour }}</span>
							<span
								class="ml-auto rounded-md px-3 py-1 text-sm font-medium text-white"
								:style="{ backgroundColor: colour }"
							>
								Your events
							</span>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="timezone">Timezone</Label>
						<select
							id="timezone"
							v-model="timezone"
							class="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							<option v-for="tz in timezones" :key="tz" :value="tz">
								{{ tz.replace(/_/g, ' ') }}
							</option>
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="sleepStart">Usually asleep from</Label>
							<Input id="sleepStart" v-model="sleepStart" type="time" required />
						</div>
						<div class="space-y-2">
							<Label for="sleepEnd">…until</Label>
							<Input id="sleepEnd" v-model="sleepEnd" type="time" required />
						</div>
					</div>

					<p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

					<Button type="submit" :disabled="submitting">
						{{ submitting ? 'Saving…' : 'Save changes' }}
					</Button>
				</form>
			</CardContent>
		</Card>
	</div>
</template>
