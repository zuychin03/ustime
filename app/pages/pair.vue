<script setup lang="ts">
import { DateTime } from 'luxon';
import { Check, Copy, Heart } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { generateInviteCode } from '~/lib/invite-code';
import { redeemSchema } from '~/lib/schemas/pairing';
import type { SupabaseClient } from '@supabase/supabase-js';

definePageMeta({ layout: 'setup', middleware: 'setup-guard' });
useHead({ title: 'Pair with your partner · UsTime' });

const supabase = useSupabaseClient() as unknown as SupabaseClient;
const user = useSupabaseUser();
const { ctx, refresh } = useCoupleContext();

if (!ctx.value?.profile?.onboarded_at) await navigateTo('/onboarding');

const couple = computed(() => ctx.value?.couple ?? null);
const isPaired = computed(() => ctx.value?.isPaired ?? false);
const pending = computed(() => !!couple.value && !couple.value.member_b);

const inviteCode = ref<string | null>(null);
const codeInput = ref('');
const copied = ref(false);
const generating = ref(false);
const redeeming = ref(false);
const genError = ref('');
const redeemError = ref('');

async function loadCode() {
	const c = couple.value;
	if (c && !c.member_b && c.member_a === user.value?.sub) {
		const { data } = await supabase
			.from('invite_codes')
			.select('code')
			.eq('couple_id', c.id)
			.is('used_at', null)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		inviteCode.value = (data as { code: string } | null)?.code ?? null;
	}
}
await loadCode();

watchEffect(() => {
	if (isPaired.value) navigateTo('/dashboard');
});

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
	if (pending.value) timer = setInterval(() => refresh(), 5000);
});
onUnmounted(() => clearInterval(timer));

async function copyCode() {
	if (!inviteCode.value) return;
	await navigator.clipboard.writeText(inviteCode.value);
	copied.value = true;
	setTimeout(() => (copied.value = false), 1500);
}

async function generate() {
	genError.value = '';
	const userId = user.value?.sub;
	if (!userId) {
		genError.value = 'Please sign in again.';
		return;
	}
	if (couple.value?.member_b) return navigateTo('/dashboard');
	generating.value = true;

	let coupleId = couple.value?.id ?? null;
	if (!coupleId) {
		const { data: created, error } = await supabase
			.from('couples')
			.insert({ member_a: userId })
			.select('id')
			.single();
		if (error) {
			genError.value = error.message;
			generating.value = false;
			return;
		}
		coupleId = (created as { id: string }).id;
	}

	const expiresAt = DateTime.utc().plus({ days: 7 }).toISO();
	let lastError = 'Could not create a code. Please try again.';
	for (let attempt = 0; attempt < 6; attempt++) {
		const code = generateInviteCode();
		const { error } = await supabase
			.from('invite_codes')
			.insert({ couple_id: coupleId, code, expires_at: expiresAt });
		if (!error) {
			await refresh();
			await loadCode();
			generating.value = false;
			return;
		}
		lastError = error.message;
		if ((error as { code?: string }).code !== '23505') break;
	}
	genError.value = lastError;
	generating.value = false;
}

async function redeem() {
	redeemError.value = '';
	const parsed = redeemSchema.safeParse({ code: codeInput.value });
	if (!parsed.success) {
		redeemError.value = 'Enter the code your partner shared.';
		return;
	}
	const userId = user.value?.sub;
	if (!userId) {
		redeemError.value = 'Please sign in again.';
		return;
	}
	redeeming.value = true;
	await supabase.from('couples').delete().eq('member_a', userId).is('member_b', null);
	const { error } = await supabase.rpc('redeem_invite', { p_code: parsed.data.code });
	redeeming.value = false;
	if (error) {
		redeemError.value = error.message;
		return;
	}
	await navigateTo('/dashboard');
}
</script>

<template>
	<Card>
		<CardHeader class="text-center">
			<div
				class="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
			>
				<Heart class="size-6" />
			</div>
			<CardTitle class="font-display text-2xl">
				{{ pending && inviteCode ? 'Share your code' : 'Find your person' }}
			</CardTitle>
			<CardDescription>
				{{
					pending && inviteCode
						? "Send this to your partner. You'll pair the moment they enter it."
						: 'Pair your two accounts to start sharing time.'
				}}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<template v-if="pending && inviteCode">
				<button
					type="button"
					class="flex w-full items-center justify-center gap-3 rounded-xl bg-muted py-5 transition-colors hover:bg-muted/70"
					@click="copyCode"
				>
					<span class="font-display text-3xl font-semibold tracking-wide">{{ inviteCode }}</span>
					<Check v-if="copied" class="size-5 text-green-600" />
					<Copy v-else class="size-5 text-muted-foreground" />
				</button>
				<p class="text-center text-sm text-muted-foreground">
					Waiting for your partner to join… this page updates on its own.
				</p>
			</template>

			<form v-else @submit.prevent="generate">
				<Button type="submit" class="w-full" :disabled="generating">
					{{ generating ? 'Creating…' : 'Create an invite code' }}
				</Button>
				<p v-if="genError" class="mt-2 text-center text-sm text-destructive" role="alert">
					{{ genError }}
				</p>
			</form>

			<div class="flex items-center gap-3">
				<div class="h-px flex-1 bg-border" />
				<span class="text-xs text-muted-foreground">or enter their code</span>
				<div class="h-px flex-1 bg-border" />
			</div>

			<form class="space-y-3" @submit.prevent="redeem">
				<Input
					v-model="codeInput"
					placeholder="lunar-fox-42"
					autocomplete="off"
					autocapitalize="none"
					:spellcheck="false"
					class="text-center"
				/>
				<p v-if="redeemError" class="text-center text-sm text-destructive" role="alert">
					{{ redeemError }}
				</p>
				<Button type="submit" variant="secondary" class="w-full" :disabled="redeeming">
					{{ redeeming ? 'Joining…' : "Join with my partner's code" }}
				</Button>
			</form>
		</CardContent>
	</Card>
</template>
