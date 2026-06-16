<script setup lang="ts">
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

definePageMeta({ layout: 'auth' });
useHead({ title: 'Sign in · UsTime' });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
watchEffect(() => {
	if (user.value) navigateTo('/dashboard');
});

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

async function onSubmit() {
	error.value = '';
	if (!email.value || !password.value) {
		error.value = 'Enter a valid email and password.';
		return;
	}
	submitting.value = true;
	const { error: e } = await supabase.auth.signInWithPassword({
		email: email.value,
		password: password.value
	});
	submitting.value = false;
	if (e) {
		error.value = e.message;
		return;
	}
	await navigateTo('/dashboard');
}
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Welcome back</CardTitle>
			<CardDescription>Sign in to your UsTime account.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<GoogleAuthButton next="/dashboard" label="Sign in with Google" />

			<div class="flex items-center gap-3">
				<div class="h-px flex-1 bg-border" />
				<span class="text-xs text-muted-foreground">or</span>
				<div class="h-px flex-1 bg-border" />
			</div>

			<form class="space-y-4" @submit.prevent="onSubmit">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" v-model="email" type="email" autocomplete="email" required />
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						v-model="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>

				<p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

				<Button type="submit" class="w-full" :disabled="submitting">
					{{ submitting ? 'Signing in…' : 'Sign in' }}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="justify-center">
			<p class="text-sm text-muted-foreground">
				No account?
				<NuxtLink
					to="/register"
					class="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Create one
				</NuxtLink>
			</p>
		</CardFooter>
	</Card>
</template>
