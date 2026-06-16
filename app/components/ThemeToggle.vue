<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';

const colorMode = useColorMode();

function toggle() {
	colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
	<Button variant="ghost" size="icon" aria-label="Toggle dark mode" @click="toggle">
		<Sun class="size-5 dark:hidden" />
		<Moon class="hidden size-5 dark:block" />
	</Button>
</template>
