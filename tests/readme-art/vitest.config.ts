import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

// Not part of `just test`: this renders the README images and writes them into .github/assets.
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/readme-art/render.svelte.ts'],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium', headless: true }]
		}
	}
});
