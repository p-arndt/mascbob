<script lang="ts">
	import { untrack } from 'svelte';
	import { getMascot } from '../context.js';
	import { HEART_PATH, SPARKLE_PATH } from '../geometry.js';
	import { BURST_LIFETIME, boopBurst, confettiPop, type Particle } from './effects.js';

	/** One-shot particle bursts: on every boop, and a confetti pop when the mood turns happy. */
	const m = getMascot();

	interface Shot {
		id: number;
		particles: Particle[];
		/** Boops also get an expanding ring around the head. */
		ring: boolean;
	}

	let shots = $state<Shot[]>([]);
	let nextId = 0;
	let timers: ReturnType<typeof setTimeout>[] = [];

	function spawn(particles: Particle[], ring: boolean) {
		const id = nextId++;
		shots.push({ id, particles, ring });
		const timer = setTimeout(() => {
			timers = timers.filter((t) => t !== timer);
			shots = shots.filter((s) => s.id !== id);
		}, BURST_LIFETIME + 150);
		timers.push(timer);
	}

	let lastBoops = m.boops;
	let lastMood = m.mood;
	const CHEERFUL = ['happy', 'love'];

	$effect(() => {
		const boops = m.boops;
		const mood = m.mood;
		const reduced = m.reduced;
		untrack(() => {
			const booped = boops > lastBoops;
			const cheered = CHEERFUL.includes(mood) && !CHEERFUL.includes(lastMood);
			lastBoops = boops;
			lastMood = mood;
			if (reduced) return;
			// A boop switches the mood to happy too; one celebration is enough.
			if (booped) spawn(boopBurst(m.shape), true);
			else if (cheered) spawn(confettiPop(m.shape), false);
		});
	});

	$effect(() => () => {
		for (const timer of timers) clearTimeout(timer);
	});

	const headCy = $derived((m.shape.top + m.shape.bottom) / 2);
</script>

{#each shots as shot (shot.id)}
	<g class="shot">
		{#if shot.ring}
			<g transform="translate(100 {headCy})">
				<ellipse
					class="shock"
					rx={m.shape.halfWidth + 4}
					ry={(m.shape.bottom - m.shape.top) / 2 + 4}
				/>
			</g>
		{/if}
		{#each shot.particles as p, i (i)}
			<g transform="translate({p.x} {p.y})">
				<g
					class="px"
					style:--dx="{p.dx}px"
					style:animation-duration="{p.duration}ms"
					style:animation-delay="{p.delay}ms"
				>
					<g
						class="py"
						style:--rise="{p.rise}px"
						style:--fall="{p.fall}px"
						style:animation-duration="{p.duration}ms"
						style:animation-delay="{p.delay}ms"
					>
						<g
							class="pp tone-{p.tone}"
							style:--spin="{p.spin}deg"
							style:animation-duration="{p.duration}ms"
							style:animation-delay="{p.delay}ms"
						>
							<g transform="scale({p.size})">
								{#if p.kind === 'star'}
									<path d={SPARKLE_PATH} transform="scale(0.75)" />
								{:else if p.kind === 'heart'}
									<path d={HEART_PATH} />
								{:else if p.kind === 'confetti'}
									<rect x="-0.5" y="-0.22" width="1" height="0.44" rx="0.12" />
								{:else}
									<circle r="0.32" />
								{/if}
							</g>
						</g>
					</g>
				</g>
			</g>
		{/each}
	</g>
{/each}

<style>
	.shot {
		pointer-events: none;
	}
	.px,
	.py,
	.pp {
		animation-fill-mode: both;
	}
	.px {
		animation-name: burst-x;
		animation-timing-function: cubic-bezier(0.15, 0.7, 0.35, 1);
	}
	.py {
		animation-name: burst-y;
		animation-timing-function: linear;
	}
	.pp {
		animation-name: burst-pop;
		animation-timing-function: ease-out;
	}
	.tone-accent {
		fill: var(--c-accent);
	}
	.tone-cheek {
		fill: var(--c-cheek);
	}
	.tone-eye {
		fill: var(--c-eye);
	}
	.tone-light {
		fill: #fff;
	}
	.shock {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2;
		transform-box: fill-box;
		transform-origin: center;
		animation: shock 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	}

	@keyframes burst-x {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(var(--dx));
		}
	}
	/* Fast climb, soft apex, accelerating fall: a throw under gravity. */
	@keyframes burst-y {
		0% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0.25, 0.6, 0.45, 1);
		}
		38% {
			transform: translateY(var(--rise));
			animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0.45);
		}
		100% {
			transform: translateY(var(--fall));
		}
	}
	@keyframes burst-pop {
		0% {
			transform: scale(0) rotate(0deg);
			opacity: 1;
		}
		14% {
			transform: scale(1.35) rotate(calc(var(--spin) * 0.2));
		}
		30% {
			transform: scale(1) rotate(calc(var(--spin) * 0.4));
		}
		70% {
			opacity: 1;
		}
		100% {
			transform: scale(0.5) rotate(var(--spin));
			opacity: 0;
		}
	}
	@keyframes shock {
		from {
			transform: scale(0.92);
			opacity: 0.55;
		}
		to {
			transform: scale(1.18);
			opacity: 0;
			stroke-width: 0.5;
		}
	}
</style>
