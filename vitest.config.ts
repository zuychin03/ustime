import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('./app', import.meta.url));

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/unit/**/*.{test,spec}.ts'],
		expect: { requireAssertions: true }
	},
	resolve: {
		alias: { '~': app, '@': app }
	}
});
