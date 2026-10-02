/**
 * Frame-by-frame rendering of an animated export, for the video and GIF encoders. Each frame
 * is the same SVG with every loop paused and its delay shifted back by the frame time, so the
 * browser paints exactly that moment; no wall clock is involved.
 */
export interface Frames {
	frames: ImageData[];
	fps: number;
	width: number;
	height: number;
}

const LOOP = /(loop\d+ (\d+)ms .+? )(-?\d+)ms infinite (\w+)/g;

/** Length in ms of one loop of the animated SVG worth rendering (e.g. the longest loop period, capped at maxMs). */
export function loopDuration(svgText: string, maxMs = 6000): number {
	let longest = 0;
	for (const [, , duration, , direction] of svgText.matchAll(LOOP)) {
		// An alternating loop only returns to its start after going there and back.
		const period = +duration * (direction.startsWith('alternate') ? 2 : 1);
		longest = Math.max(longest, period);
	}
	return Math.min(longest, maxMs);
}

/**
 * Retimes every loop so a whole number of its cycles fits `clipMs`, which makes a clip of that
 * length wrap without a jump. The loops' own periods share no common multiple, so each is
 * nudged to the nearest fitting one instead; the speed changes by a few percent at most.
 */
export function fitLoops(svgText: string, clipMs: number): string {
	return svgText.replace(
		LOOP,
		(match, head: string, duration: string, delay, direction: string) => {
			const legs = direction.startsWith('alternate') ? 2 : 1;
			const cycles = Math.max(1, Math.round(clipMs / (+duration * legs)));
			const fitted = Math.round(clipMs / cycles / legs);
			return `${head.replace(`${duration}ms`, `${fitted}ms`)}${delay}ms infinite ${direction}`;
		}
	);
}

function atTime(svgText: string, t: number) {
	return (
		svgText
			.replace(
				LOOP,
				// Pulling positive delays back by whole cycles renders the steady loop: a frame
				// before a staggered loop starts would show its unanimated pose and break the seam.
				(_, head, duration, delay, direction) =>
					`${head}${delay - 2 * duration * Math.ceil(delay / (2 * duration)) - t}ms infinite ${direction}`
			)
			// The frames are the motion; the viewer's reduced-motion setting must not flatten them.
			.replace(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\}\}/, '')
			.replace('</style>', '*{animation-play-state:paused!important}</style>')
	);
}

/** Renders the animated SVG frame by frame, deterministically, onto transparent canvases. */
export async function renderFrames(
	svgText: string,
	opts: { width: number; height: number; fps?: number; duration?: number }
): Promise<Frames> {
	const { width, height, fps = 30, duration = loopDuration(svgText) } = opts;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	const count = Math.max(1, Math.round((duration / 1000) * fps));
	const frames: ImageData[] = [];
	for (let i = 0; i < count; i++) {
		const url = URL.createObjectURL(
			new Blob([atTime(svgText, (i * 1000) / fps)], { type: 'image/svg+xml' })
		);
		try {
			const img = new Image();
			img.src = url;
			await img.decode();
			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0, width, height);
			frames.push(ctx.getImageData(0, 0, width, height));
		} finally {
			URL.revokeObjectURL(url);
		}
	}
	return { frames, fps, width, height };
}
