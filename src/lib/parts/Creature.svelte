<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { drag, RELEASE_SPRING, tune } from '../grab.js';
	import { floatingHands } from './body.js';
	import { HATS } from './accessories.js';
	import Octopus from './Octopus.svelte';
	import Snail from './Snail.svelte';

	let { layer }: { layer: 'back' | 'markings' | 'front' } = $props();
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const p = $derived(m.proportions);
	const unified = $derived(m.species === 'moss' || m.species === 'wisp');
	const handWidth = $derived(m.shape.handHalfWidth ?? m.shape.halfWidth);
	const low = $derived(m.mood === 'sad' || m.mood === 'sleepy');
	const excited = $derived(m.mood === 'happy' || m.mood === 'love' || m.mood === 'waving');
	const targets = $derived.by(() => {
		const hands = floatingHands(m.config.hands, m.mood, handWidth);
		const offset = m.body && unified ? (m.shape.bottom - 224) * 0.25 : 0;
		return {
			left: { ...hands.left, y: hands.left.y + offset },
			right: { ...hands.right, y: hands.right.y + offset }
		};
	});
	const pose = new Spring(
		{ lx: 31, ly: 136, lr: 18, rx: 31, ry: 136, rr: 18 },
		{ stiffness: 0.1, damping: 0.45 }
	);
	$effect(() => {
		const { left: l, right: r } = targets;
		pose.set({ lx: l.x, ly: l.y, lr: l.rot, rx: r.x, ry: r.y, rr: r.rot }, { instant: m.reduced });
	});
	const pulls = [
		new Spring({ x: 0, y: 0 }, RELEASE_SPRING),
		new Spring({ x: 0, y: 0 }, RELEASE_SPRING)
	];
	let frame = $state<SVGGElement>();
	function grabHand(e: PointerEvent, index: number) {
		// These hands are inside the silhouette's group; don't start a second head drag.
		e.stopPropagation();
		let start = { x: 0, y: 0 };
		drag(e, {
			frame: () => frame,
			start: (point) => {
				if (!m.grab(index === 0 ? 'arm-left' : 'arm-right')) return false;
				start = point;
				tune(pulls[index], true);
			},
			move: (point) =>
				pulls[index].set({ x: point.x - start.x, y: point.y - start.y }, { instant: m.reduced }),
			end: () => {
				tune(pulls[index], false);
				pulls[index].set({ x: 0, y: 0 }, { instant: m.reduced });
				m.release();
			}
		});
	}
</script>

{#if m.species === 'snail'}
	<Snail {layer} />
{:else if m.species === 'octo'}
	<Octopus {layer} />
{:else if m.species !== 'bob'}
	<g class="creature-{m.species}" class:low class:excited>
		{#if layer === 'back' && m.species === 'moss' && m.body}
			<g transform="translate(100 {m.shape.bottom - 6}) scale({p.body} 1)">
				<path
					class="skin"
					d="M-27 0Q-32 5-37 18Q-24 22-13 11Q-10 24 0 17Q10 24 13 11Q24 22 37 18Q32 5 27 0Z"
				/>
			</g>
		{/if}
		{#if layer === 'back' && m.species === 'critter'}
			{#each [-1, 1] as side (side)}
				<g
					transform="translate({100 + side * 40} 61) rotate({side *
						(low ? 58 : 24)}) scale({p.ears})"
				>
					<g class="ear">
						<path class="skin" d="M-17 8C-25-9-20-39-7-44C7-46 18-13 15 8Z" />
						<path class="accent" d="M-9 0C-15-13-12-29-6-32C1-33 9-12 7 0Z" />
					</g>
				</g>
			{/each}
		{:else if layer === 'back' && m.species === 'moss' && !m.accessories.some((a) => (HATS as readonly string[]).includes(a) || a === 'sprout' || a === 'antenna')}
			<g transform="translate(100 {m.shape.top + 7}) rotate({low ? -12 : 0})">
				<g class="foliage">
					<path
						class="leaf"
						d="M0 1C-32 7-41-10-35-26C-17-26-2-16 0 1ZM0 1C-1-23 12-34 30-31C32-12 21 1 0 1Z"
					/>
					<path class="vein" d="M0 1L-28-19M0 1L24-25" />
				</g>
			</g>
		{:else if layer === 'markings'}
			<g clip-path={ref('shell-clip')}>
				{#if m.species === 'moss'}
					<ellipse
						class="patch"
						cx="100"
						cy={146 + (m.shape.bottom - 146) * 0.67}
						rx={28 * p.body}
						ry={18 * p.height}
					/>
					{#each [-1, 1] as side (side)}
						<path class="vein" d="M{100 + side * m.shape.halfWidth * 0.74} 139l{side * 4} 6" />
					{/each}
				{:else if m.species === 'wisp'}
					<ellipse
						class="spirit-glow"
						cx="100"
						cy={146 + (m.shape.bottom - 146) * 0.47}
						rx={27 * p.body}
						ry={18 * p.height}
					/>
					{#each [0, 1, 2] as i (i)}
						<circle
							class="spirit-spark"
							cx={100 + (i - 1) * 9}
							cy={146 + (m.shape.bottom - 146) * 0.47 + (i === 1 ? -3 : 1)}
							r={i === 1 ? 2.5 : 1.5}
						/>
					{/each}
				{/if}
			</g>
		{:else if layer === 'front' && unified && m.body}
			<g bind:this={frame}>
				{#each [0, 1] as index (index)}
					{@const h = pose.current}
					{@const x = index === 0 ? h.lx : 200 - h.rx}
					{@const y = index === 0 ? h.ly : h.ry}
					{@const r = index === 0 ? h.lr : -h.rr}
					{#if m.species === 'moss'}
						{@const side = index === 0 ? -1 : 1}
						<path
							class="stem"
							d="M{100 + side * (handWidth - 4)} {142 + (m.shape.bottom - 224) * 0.25}Q{100 +
								side * (handWidth + 8)} {y + 12} {x + pulls[index].current.x} {y +
								pulls[index].current.y}"
						/>
					{/if}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<g
						data-grab={index === 0 ? 'arm-left' : 'arm-right'}
						class:grabbable={m.canGrab}
						onpointerdown={(e) => grabHand(e, index)}
						transform="translate({x + pulls[index].current.x} {y +
							pulls[index].current.y}) rotate({r}) scale({p.arms})"
						style:touch-action="none"
					>
						<g class="appendage" class:wave={index === 1 && m.config.hands === 'wave'}>
							{#if m.species === 'moss'}
								<path class="leaf" d="M0-18C-21-9-18 16 0 24C18 16 21-9 0-18Z" />
								<path class="vein" d="M0-10V17M0 5L-9-2M0 10L9 3" />
							{:else}
								<path
									class="skin"
									d="M0-13C-11-13-16-2-12 6C-8 15 4 16 12 7Q5 9 6 3C15-12 7-16 0-13Z"
								/>
								<path class="hand-glint" d="M-5-7Q-9-4-8 0" />
							{/if}
						</g>
					</g>
				{/each}
			</g>
		{/if}
	</g>
{/if}

<style>
	.skin {
		fill: var(--c-body-mid);
		stroke: color-mix(in oklab, var(--c-visor) 65%, var(--c-accent));
		stroke-width: 1.6;
		stroke-opacity: 0.5;
	}
	.accent {
		fill: var(--c-accent);
	}
	.hand-glint {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0.8;
	}
	.patch {
		fill: var(--c-body-light);
		opacity: 0.85;
	}
	.leaf {
		fill: var(--c-accent);
		stroke: var(--c-visor);
		stroke-width: 1.3;
		stroke-opacity: 0.4;
	}
	.stem {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 4;
		stroke-linecap: round;
	}
	.vein {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-linecap: round;
		opacity: 0.35;
	}
	.spirit-glow {
		fill: var(--c-body-light);
		opacity: 0.6;
	}
	.spirit-spark {
		fill: var(--c-accent);
		opacity: 0.65;
	}
	.ear,
	.foliage,
	.appendage {
		transform-origin: 0 0;
		animation: sway 3s ease-in-out infinite alternate;
	}
	.excited .ear {
		animation-duration: 0.6s;
	}
	.low .foliage {
		animation-duration: 5s;
	}
	.appendage.wave {
		animation: wave 0.35s ease-in-out infinite alternate;
	}
	.grabbable {
		cursor: grab;
	}
	@keyframes sway {
		to {
			transform: rotate(5deg);
		}
	}
	@keyframes wave {
		from {
			transform: rotate(-18deg);
		}
		to {
			transform: rotate(18deg);
		}
	}
</style>
