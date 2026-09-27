<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import type { HandPose } from '../types.js';

	/** Floating hands for head-only mode. */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	function positions(pose: HandPose, hw: number) {
		const left = 100 - hw - 12;
		const right = 100 + hw + 12;
		switch (pose) {
			case 'up':
				return { lx: left - 6, ly: 84, rx: right + 6, ry: 84 };
			case 'wave':
				return { lx: left, ly: 134, rx: right + 4, ry: 86 };
			case 'think':
				return { lx: left, ly: 134, rx: 100 + hw - 10, ry: 152 };
			default:
				return { lx: left, ly: 134, rx: right, ry: 134 };
		}
	}

	const pos = Spring.of(() => positions(m.config.hands, m.shape.halfWidth), {
		stiffness: 0.07,
		damping: 0.4
	});
</script>

<g class="hand">
	<circle class="orb" cx={pos.current.lx} cy={pos.current.ly} r="10" fill={ref('hand')} />
</g>
<g class="hand" class:waving={m.config.hands === 'wave'}>
	<circle class="orb" cx={pos.current.rx} cy={pos.current.ry} r="10" fill={ref('hand')} />
</g>

<style>
	.orb {
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 1;
	}
	.hand {
		transform-box: fill-box;
		transform-origin: center;
		animation: bob calc(var(--float-speed) * 0.8) ease-in-out infinite alternate;
	}
	.hand + .hand {
		animation-delay: -0.6s;
	}
	.hand.waving {
		animation: wave 0.5s ease-in-out infinite alternate;
	}
	@keyframes bob {
		to {
			transform: translateY(-4px);
		}
	}
	@keyframes wave {
		from {
			transform: translate(-2px, 2px) rotate(-8deg);
		}
		to {
			transform: translate(3px, -3px) rotate(8deg);
		}
	}
</style>
