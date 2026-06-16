// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
	{ ignores: ['app/components/ui/**'] },
	{
		rules: {
			'vue/html-self-closing': 'off'
		}
	}
);
