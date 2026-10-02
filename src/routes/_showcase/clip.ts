import { fitLoops, renderFrames } from './frames.js';

export const CLIP_FORMATS = ['gif', 'webp', 'webm'] as const;
export type ClipFormat = (typeof CLIP_FORMATS)[number];

/** Long enough for every idle loop to show, short enough to keep the files small. */
export const CLIP_MS = 3000;

/**
 * A seamless looping clip of an animated export, its longest side `longest` px. Encoders load
 * on demand so the showcase does not ship them to visitors who never export.
 */
export async function renderClip(
	animatedSvg: string,
	size: { width: number; height: number },
	format: ClipFormat,
	longest = 512
): Promise<Blob> {
	const scale = longest / Math.max(size.width, size.height);
	// VP9 stores colour at half resolution, so odd edges would be cropped or rejected.
	const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
	const frames = await renderFrames(fitLoops(animatedSvg, CLIP_MS), {
		width: even(size.width),
		height: even(size.height),
		duration: CLIP_MS
	});
	if (format === 'gif') return (await import('./encoders/gif.js')).encodeGif(frames);
	if (format === 'webp') return (await import('./encoders/webp.js')).encodeWebp(frames);
	return (await import('./encoders/webm.js')).encodeWebm(frames);
}
