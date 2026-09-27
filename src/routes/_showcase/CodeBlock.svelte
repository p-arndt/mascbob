<script lang="ts">
	import Code from './Code.svelte';
	import { highlight } from './docs.js';
	import { copyText } from './interactions.js';

	let { code, file }: { code: string; file?: string } = $props();

	const lines = $derived(highlight(code));
	let copied = $state(false);
	async function copy() {
		copied = await copyText(code);
		setTimeout(() => (copied = false), 1400);
	}
</script>

<div class="block">
	<div class="bar">
		<em>{file ?? ''}</em>
		<button class:done={copied} onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
	</div>
	<Code {lines} />
</div>

<style>
	/* Code stays on the dark slab in both schemes, so the chrome colors are fixed. */
	.block {
		border-radius: 20px;
		background: var(--slab);
		box-shadow: inset 0 0 0 1px var(--slab-line);
		padding: 0.3rem;
		min-width: 0;
	}
	.block :global(pre) {
		box-shadow: none;
		padding-top: 0.25rem;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.45rem 0.5rem 0 0.9rem;
	}
	em {
		font-style: normal;
		font-family: var(--mono);
		font-size: 0.78rem;
		color: #a3a19c;
	}
	button {
		padding: 0.28rem 0.75rem;
		border: 0;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.1);
		color: #eaeaea;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: rgb(255 255 255 / 0.18);
	}
	button.done {
		background: #fff;
		color: #161616;
	}
</style>
