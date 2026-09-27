<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { MITTEN_PATH, floatingHands } from './body.js';

	/** Floating mitten hands for head-only mode. */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	const target = $derived(floatingHands(m.config.hands, m.mood, m.shape.halfWidth));
	const hands = new Spring(
		{ lx: 0, ly: 0, lr: 0, rx: 0, ry: 0, rr: 0 },
		{ stiffness: 0.08, damping: 0.4 }
	);
	let placed = false;
	$effect(() => {
		const { left, right } = target;
		hands.set(
			{ lx: left.x, ly: left.y, lr: left.rot, rx: right.x, ry: right.y, rr: right.rot },
			// The first placement snaps so the hands don't fly in from the corner.
			{ instant: m.reduced || !placed }
		);
		placed = true;
	});

	// Underdamped: one kick overshoots back and forth, so a boop reads as a jiggle.
	const bounce = new Spring(0, { stiffness: 0.1, damping: 0.18 });
	let seenBoops = m.boops;
	$effect(() => {
		const boops = m.boops;
		if (boops === seenBoops) return;
		seenBoops = boops;
		if (m.reduced) return;
		bounce.set(1, { instant: true });
		bounce.target = 0;
	});

	const squeeze = new Spring(0, { stiffness: 0.2, damping: 0.55 });
	$effect(() => {
		squeeze.set(m.pressed ? 1 : 0, { instant: m.reduced });
	});

	const b = $derived(bounce.current);
	const c = $derived(squeeze.current);
	const h = $derived(hands.current);
	const waving = $derived(m.config.hands === 'wave' && m.mood !== 'listening');
	// Hands flare outward on a boop and tuck in (anticipation) while pressed.
	const place = (x: number, y: number, rot: number) =>
		`translate(${(x - b * 9 + c * 4).toFixed(2)} ${(y - b * 6).toFixed(2)}) rotate(${(rot + b * 28).toFixed(2)}) scale(${(1 + b * 0.12 - c * 0.06).toFixed(3)})`;
</script>

{#snippet mitten(waves: boolean, late: boolean)}
	<g class="bob" class:late>
		<g class="motion" class:wave={waves} class:fidget={m.hovered}>
			<g transform="scale(1.65) translate(0 -6.5)">
				<ellipse class="glow" cx="0" cy="6.5" rx="7" ry="7.5" filter={ref('soft')} />
				<ellipse class="cuff" cx="0" cy="0.7" rx="4.7" ry="1.9" />
				<path class="skin" d={MITTEN_PATH} fill={ref('hand')} />
				<path class="shine" d="M-3.4 3.5C-4 6-3.6 8.4-2.2 9.6" />
			</g>
		</g>
	</g>
{/snippet}

<g transform={place(h.lx, h.ly, h.lr)}>
	{@render mitten(false, false)}
</g>
<g transform="translate(200 0) scale(-1 1)">
	<g transform={place(h.rx, h.ry, h.rr)}>
		{@render mitten(waving, true)}
	</g>
</g>

<style>
	.glow {
		fill: var(--c-accent);
		opacity: 0.22;
	}
	.skin {
		stroke: #fff;
		stroke-opacity: 0.6;
		stroke-width: 0.7;
	}
	.shine {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.85;
		stroke-width: 1;
		stroke-linecap: round;
	}
	.cuff {
		fill: var(--c-accent);
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 0.5;
	}

	/* Each group's origin is the hand's center, so rotations pivot in place. */
	.bob,
	.motion {
		transform-box: view-box;
		transform-origin: 0 0;
	}
	.bob {
		animation: bob calc(var(--float-speed) * 0.8) ease-in-out infinite alternate;
	}
	.bob.late {
		animation-delay: -0.6s;
	}
	.motion.wave {
		/* Pivot near the wrist so the palm swings like a real wave. */
		transform-origin: 0 9px;
		animation: wave 0.34s ease-in-out infinite alternate;
	}
	.motion.fidget:not(.wave) {
		animation: fidget 0.5s ease-in-out 2;
	}

	@keyframes bob {
		to {
			transform: translateY(-4px) rotate(4deg);
		}
	}
	@keyframes wave {
		from {
			transform: rotate(-22deg) scale(1.05, 0.95);
		}
		to {
			transform: rotate(22deg) scale(0.95, 1.05);
		}
	}
	@keyframes fidget {
		0%,
		100% {
			transform: rotate(0);
		}
		30% {
			transform: rotate(-16deg) scale(1.08);
		}
		70% {
			transform: rotate(12deg) scale(0.95);
		}
	}
</style>
