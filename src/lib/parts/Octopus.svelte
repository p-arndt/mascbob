<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { drag, RELEASE_SPRING, rubber, type GrabPart } from '../grab.js';

	let { layer }: { layer: 'back' | 'markings' | 'front' } = $props();
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const p = $derived(m.proportions);
	const sleepy = $derived(m.mood === 'sleepy' || m.mood === 'sad');
	const happy = $derived(m.mood === 'happy' || m.mood === 'love' || m.mood === 'waving');
	const curl = new Spring(0, { stiffness: 0.09, damping: 0.5 });
	$effect(() => {
		curl.set(sleepy ? 1 : 0, { instant: m.reduced });
	});
	const parts: GrabPart[] = ['arm-left', 'arm-right', 'leg-left', 'leg-right'];
	const pulls = parts.map(() => new Spring({ x: 0, y: 0 }, RELEASE_SPRING));
	let frame = $state<SVGGElement>();
	let held = $state<number | null>(null);
	function grabTentacle(e: PointerEvent, index: number) {
		e.stopPropagation();
		let start = { x: 0, y: 0 };
		drag(e, {
			frame: () => frame,
			start: (point) => {
				if (!m.grab(parts[index])) return false;
				start = point;
				held = index;
			},
			move: (point) => {
				const soften = (v: number) =>
					Math.abs(v) <= 45 ? v : Math.sign(v) * (45 + rubber(Math.abs(v) - 45, 65));
				pulls[index].set(
					{ x: soften(point.x - start.x), y: soften(point.y - start.y) },
					{ instant: true }
				);
			},
			end: () => {
				held = null;
				pulls[index].set({ x: 0, y: 0 }, { instant: m.reduced });
				m.release();
			}
		});
	}
</script>

{#if layer === 'markings'}
	<g class="octo-freckles" clip-path={ref('shell-clip')}>
		{#each [-1, 1] as side (side)}
			{#each [0, 1, 2] as i (i)}
				<ellipse
					cx={100 + side * (33 + i * 5)}
					cy={m.shape.bottom - 24 - (i % 2) * 5}
					rx={i === 1 ? 2.3 : 1.6}
					ry={i === 1 ? 3 : 2}
				/>
			{/each}
		{/each}
	</g>
{:else if layer === 'back' && m.body}
	<g class="octo-tentacles" bind:this={frame} class:happy>
		{#each [0, 1, 2, 3] as index (index)}
			{@const side = index % 2 === 0 ? -1 : 1}
			{@const back = index < 2}
			{@const rootX = 100 + side * (back ? 32 : 18) * (0.75 + p.body * 0.25)}
			{@const rootY = m.shape.bottom - (back ? 19 : 6)}
			{@const x =
				(back ? 24 : 9) * (0.7 + p.arms * 0.3) * (1 - curl.current * 0.5) +
				pulls[index].current.x * side}
			{@const y = (back ? 27 : 24) * p.arms * (1 - curl.current * 0.55) + pulls[index].current.y}
			<g transform="translate({rootX} {rootY}) scale({side} 1)">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					class="tentacle"
					class:held={held === index}
					class:grabbable={m.canGrab}
					class:wave={index === 1 && m.config.hands === 'wave'}
					data-grab={parts[index]}
					onpointerdown={(e) => grabTentacle(e, index)}
					style:touch-action="none"
					style:animation-delay="{index * -0.65}s"
				>
					<path
						class="tentacle-skin"
						fill={ref('body')}
						d="M-12-3C-17 15 {x - 23} {y + 21} {x} {y + 18}C{x + 19} {y + 16} {x + 21} {y - 5} {x +
							10} {y - 7}C{x + 1} {y - 9} {x - 3} {y + 1} {x + 4} {y + 4}C{x + 8} {y + 6} {x +
							9} {y + 2} {x + 9} {y + 1}C{x + 12} {y + 9} {x + 2} {y + 12} {x - 4} {y + 7}C{x -
							14} {y - 2} 11 11 12-3Z"
					/>
					<path class="underside" d="M{x - 10} {y + 9}Q{x + 6} {y + 19} {x + 13} {y + 7}" />
					{#each [0, 1, 2] as cup (cup)}
						<ellipse
							class="sucker"
							cx={x - 6 + cup * 6}
							cy={y + 12 - (cup === 2 ? 3 : 0)}
							rx="2.1"
							ry="1.5"
						/>
					{/each}
				</g>
			</g>
		{/each}
	</g>
{/if}

<style>
	.tentacle-skin {
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-opacity: 0.5;
		stroke-linejoin: round;
	}
	.underside {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 6;
		stroke-linecap: round;
		opacity: 0.7;
	}
	.sucker {
		fill: var(--c-accent);
		opacity: 0.65;
	}
	.octo-freckles {
		fill: var(--c-accent);
		opacity: 0.45;
	}
	.tentacle {
		transform-origin: 0 0;
		animation: waddle 3.2s ease-in-out infinite alternate;
	}
	.happy .tentacle {
		animation-duration: 0.7s;
	}
	.tentacle.wave {
		animation-name: wave;
		animation-duration: 0.5s;
	}
	.tentacle.held {
		animation: none;
	}
	.grabbable {
		cursor: grab;
	}
	@keyframes waddle {
		from {
			transform: rotate(-3deg);
		}
		to {
			transform: rotate(4deg);
		}
	}
	@keyframes wave {
		from {
			transform: rotate(-35deg);
		}
		to {
			transform: rotate(-55deg);
		}
	}
</style>
