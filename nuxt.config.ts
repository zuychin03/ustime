import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	modules: ['@nuxtjs/supabase', '@nuxtjs/color-mode', '@nuxt/eslint'],

	css: ['~/assets/css/main.css'],

	components: [{ path: '~/components', ignore: ['ui/**'] }],

	typescript: {
		tsConfig: {
			compilerOptions: {
				noUncheckedIndexedAccess: false
			},
			exclude: ['../app/components/ui/**']
		}
	},

	vite: {
		plugins: [tailwindcss()]
	},

	colorMode: {
		classSuffix: '',
		preference: 'system',
		fallback: 'light'
	},

	supabase: {
		types: false,
		redirectOptions: {
			login: '/login',
			callback: '/confirm',
			exclude: ['/', '/register']
		}
	}
});
