import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

// Not part of `just test`: this exports regression references for the Compose port.
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/widget-art/render.svelte.ts'],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium', headless: true }]
		}
	}
});
