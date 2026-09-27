<script lang="ts" module>
	/** A colored fragment: CSS class (see `.t-*` in showcase.css) and its text. */
	export type Token = [cls: string, text: string];

	export function plain(lines: Token[][]) {
		return lines.map((line) => line.map(([, t]) => t).join('')).join('\n');
	}
</script>

<script lang="ts">
	// Pre-tokenized lines keep the page free of a syntax-highlighting dependency.
	let { lines }: { lines: Token[][] } = $props();
</script>

<pre><code
		>{#each lines as line, i (i)}<span class="line"
				>{#each line as [cls, text], j (j)}<span class={cls}>{text}</span>{/each}</span
			>{/each}</code
	></pre>

<style>
	.line {
		display: block;
		min-height: 1lh;
		white-space: pre;
	}
</style>
