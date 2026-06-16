import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

// Client-side cache for Supabase reads + optimistic updates (spec §2).
export default defineNuxtPlugin((nuxt) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				refetchOnWindowFocus: false,
				retry: 1
			}
		}
	});

	nuxt.vueApp.use(VueQueryPlugin, { queryClient });
});
