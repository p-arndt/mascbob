import type { Attachment } from 'svelte/attachments';

let observer: IntersectionObserver | undefined;

function sharedObserver() {
	// One observer for the whole page is far cheaper than one per element.
	observer ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const el = entry.target as HTMLElement;
				el.classList.add('in');
				observer?.unobserve(el);
				// Drop the reveal transition afterwards so it doesn't slow down the element's own hover effects.
				el.addEventListener(
					'transitionend',
					() => {
						el.classList.remove('reveal', 'in');
						el.style.removeProperty('--reveal-delay');
					},
					{ once: true }
				);
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
	);
	return observer;
}

/**
 * Fades an element in the first time it scrolls into view. The hidden state is only applied
 * from script, so server-rendered content stays visible without JS, and anything already on
 * screen at hydration is left alone instead of flashing out and back in.
 */
export function reveal(delay = 0): Attachment<HTMLElement> {
	return (node) => {
		if (typeof IntersectionObserver === 'undefined') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const rect = node.getBoundingClientRect();
		if (rect.top < innerHeight && rect.bottom > 0) return;
		node.style.setProperty('--reveal-delay', `${delay}ms`);
		node.classList.add('reveal');
		const io = sharedObserver();
		io.observe(node);
		return () => io.unobserve(node);
	};
}

/** Feeds the pointer position into `--mx`/`--my` so CSS can paint a spotlight that follows it. */
export const spotlight: Attachment<HTMLElement> = (node) => {
	const move = (e: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		node.style.setProperty('--mx', `${e.clientX - rect.left}px`);
		node.style.setProperty('--my', `${e.clientY - rect.top}px`);
	};
	node.addEventListener('pointermove', move);
	return () => node.removeEventListener('pointermove', move);
};

export function pick<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

export async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
