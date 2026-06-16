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
useHead({ title: 'Create your account · UsTime' });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
watchEffect(() => {
	if (user.value) navigateTo('/dashboard');
});

const displayName = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
const done = ref(false);

async function onSubmit() {
	error.value = '';
	if (password.value.length < 8) {
		error.value = 'Password must be at least 8 characters.';
		return;
	}
	submitting.value = true;
	const { data, error: e } = await supabase.auth.signUp({
		email: email.value,
		password: password.value,
		options: {
			emailRedirectTo: `${window.location.origin}/confirm?next=/dashboard`,
			data: displayName.value ? { display_name: displayName.value } : undefined
		}
	});
	submitting.value = false;
	if (e) {
		error.value = e.message;
		return;
	}
	if (data.session) {
		await navigateTo('/dashboard');
		return;
	}
	done.value = true;
}
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Create your account</CardTitle>
			<CardDescription>Start sharing time with your person.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<p v-if="done" class="rounded-md bg-muted p-3 text-sm" role="status">
				Check your email to confirm your account, then sign in.
			</p>
			<template v-else>
				<GoogleAuthButton next="/dashboard" label="Sign up with Google" />

				<div class="flex items-center gap-3">
					<div class="h-px flex-1 bg-border" />
					<span class="text-xs text-muted-foreground">or</span>
					<div class="h-px flex-1 bg-border" />
				</div>

				<form class="space-y-4" @submit.prevent="onSubmit">
					<div class="space-y-2">
						<Label for="displayName">Display name</Label>
						<Input
							id="displayName"
							v-model="displayName"
							type="text"
							autocomplete="name"
							placeholder="What should we call you?"
						/>
					</div>
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
							autocomplete="new-password"
							required
							:minlength="8"
						/>
					</div>

					<p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

					<Button type="submit" class="w-full" :disabled="submitting">
						{{ submitting ? 'Creating account…' : 'Create account' }}
					</Button>
				</form>
			</template>
		</CardContent>
		<CardFooter class="justify-center">
			<p class="text-sm text-muted-foreground">
				Already have an account?
				<NuxtLink
					to="/login"
					class="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Sign in
				</NuxtLink>
			</p>
		</CardFooter>
	</Card>
</template>
