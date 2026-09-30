<script lang="ts">
	import { untrack } from 'svelte';
	import { getMascot } from '../context.js';
	import { REACTION_TIMING } from '../interaction.js';
	import { HEART_PATH, SPARKLE_PATH } from '../geometry.js';
	import { boopBurst, confettiPop, headBlast, type Particle } from './effects.js';

	/**
	 * One-shot particle bursts: on every boop, a confetti pop when the mood turns happy, and
	 * the head blast when it explodes.
	 */
	const m = getMascot();

	interface Shot {
		id: number;
		particles: Particle[];
		/** Boops also get an expanding ring around the head. */
		ring: boolean;
		/** Flash, rays and shockwaves of the head blast, after its fuse. */
		blast?: boolean;
	}

	let shots = $state<Shot[]>([]);
	let nextId = 0;
	let timers: ReturnType<typeof setTimeout>[] = [];

	function spawn(particles: Particle[], ring: boolean, blast = false) {
		const id = nextId++;
		shots.push({ id, particles, ring, blast });
		const lifetime = Math.max(...particles.map((p) => p.delay + p.duration));
		const timer = setTimeout(() => {
			timers = timers.filter((t) => t !== timer);
			shots = shots.filter((s) => s.id !== id);
		}, lifetime + 150);
		timers.push(timer);
	}

	let lastBoops = m.boops;
	let lastMood = m.mood;
	let lastReaction = m.reaction;
	const CHEERFUL = ['happy', 'love'];

	$effect(() => {
		const boops = m.boops;
		const mood = m.mood;
		const reaction = m.reaction;
		const reduced = m.reduced;
		untrack(() => {
			const booped = boops > lastBoops;
			const cheered = CHEERFUL.includes(mood) && !CHEERFUL.includes(lastMood);
			const blasted = reaction === 'explode' && lastReaction !== 'explode';
			lastBoops = boops;
			lastMood = mood;
			lastReaction = reaction;
			if (reduced) return;
			if (blasted) spawn(headBlast(m.shape), false, true);
			// No head to pop stars out of while it is blown apart.
			else if (reaction === 'explode') return;
			// A boop switches the mood to happy too; one celebration is enough.
			else if (booped) spawn(boopBurst(m.shape), true);
			else if (cheered) spawn(confettiPop(m.shape), false);
		});
	});

	$effect(() => () => {
		for (const timer of timers) clearTimeout(timer);
	});

	const headCy = $derived((m.shape.top + m.shape.bottom) / 2);
	const headRy = $derived((m.shape.bottom - m.shape.top) / 2);
	const RAYS = Array.from({ length: 12 }, (_, i) => ({
		angle: i * 30 + (i % 2) * 9,
		long: i % 2 === 0
	}));
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
		{#if shot.blast}
			<g
				class="blast-fx"
				transform="translate(100 {headCy})"
				style:--fuse="{REACTION_TIMING.explodeFuse}ms"
			>
				<g class="rays">
					{#each RAYS as ray (ray.angle)}
						<line
							x1={m.shape.halfWidth * 0.7}
							x2={m.shape.halfWidth * (ray.long ? 1.9 : 1.45)}
							transform="rotate({ray.angle})"
						/>
					{/each}
				</g>
				<ellipse class="flash" rx={m.shape.halfWidth * 1.1} ry={headRy * 1.1} />
				<circle class="core" r={m.shape.halfWidth * 0.75} />
				<ellipse class="wave" rx={m.shape.halfWidth + 4} ry={headRy + 4} />
				<ellipse class="wave late" rx={m.shape.halfWidth + 4} ry={headRy + 4} />
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
							class:puff={p.kind === 'puff'}
							style:--spin="{p.spin}deg"
							style:animation-duration="{p.duration}ms"
							style:animation-delay="{p.delay}ms"
						>
							<g transform="scale({p.size})">
								{#if p.kind === 'star'}
									<path d={SPARKLE_PATH} transform="scale(0.75)" />
								{:else if p.kind === 'heart'}
									<path d={HEART_PATH} />
								{:else if p.kind === 'puff'}
									<circle r="1" />
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
	.pp.puff {
		animation-name: puff;
		animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
	}
	.tone-smoke {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 0.04;
		stroke-opacity: 0.4;
	}
	.blast-fx > * {
		transform-box: fill-box;
		transform-origin: center;
		animation-delay: var(--fuse);
		animation-fill-mode: both;
	}
	.rays {
		stroke: var(--c-accent);
		stroke-width: 4;
		stroke-linecap: round;
		animation: rays 0.45s cubic-bezier(0.1, 0.8, 0.3, 1);
	}
	.flash {
		fill: #fff;
		animation: flash 0.35s ease-out;
	}
	.core {
		fill: var(--c-accent);
		animation: core 0.5s cubic-bezier(0.1, 0.8, 0.3, 1);
	}
	.wave {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 3;
		animation: wave 0.8s cubic-bezier(0.1, 0.7, 0.3, 1);
	}
	.wave.late {
		stroke: var(--c-eye);
		stroke-width: 2;
		animation-delay: calc(var(--fuse) + 140ms);
	}
	.tone-body {
		fill: var(--c-body-mid);
		stroke: var(--c-visor);
		stroke-width: 0.08;
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
	@keyframes puff {
		0% {
			transform: scale(0.2);
			opacity: 0.9;
		}
		30% {
			transform: scale(1);
			opacity: 0.8;
		}
		100% {
			transform: scale(1.35);
			opacity: 0;
		}
	}
	@keyframes rays {
		from {
			transform: scale(0.4) rotate(0deg);
			opacity: 1;
		}
		to {
			transform: scale(1.5) rotate(12deg);
			opacity: 0;
			stroke-width: 0.5;
		}
	}
	@keyframes flash {
		from {
			transform: scale(0.4);
			opacity: 0.95;
		}
		to {
			transform: scale(1.7);
			opacity: 0;
		}
	}
	@keyframes core {
		from {
			transform: scale(0.2);
			opacity: 1;
		}
		to {
			transform: scale(1.4);
			opacity: 0;
		}
	}
	@keyframes wave {
		from {
			transform: scale(0.7);
			opacity: 0.9;
		}
		to {
			transform: scale(2.3);
			opacity: 0;
			stroke-width: 0.3;
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
