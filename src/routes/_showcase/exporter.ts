/**
 * Standalone exports of a live mascot. The component styles itself through scoped CSS and
 * custom properties, which a standalone file does not have, so the snapshot bakes the
 * computed paint of every element into attributes. CSS transforms are left out on
 * purpose: they are the idle animations, and the rest pose is what a still export should
 * show. An animated export carries those loops along as plain keyframes instead.
 */
const PAINT = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-dasharray',
	'opacity',
	'stop-color',
	'stop-opacity',
	'mix-blend-mode',
	'display',
	'visibility'
] as const;

/** Properties that children inherit: written only where they change from the parent. */
const INHERITED = new Set<string>([
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-dasharray',
	'visibility'
]);

/** Initial values; writing them out would only bloat the file. */
const INITIAL: Record<(typeof PAINT)[number], string> = {
	fill: 'rgb(0, 0, 0)',
	'fill-opacity': '1',
	stroke: 'none',
	'stroke-width': '1px',
	'stroke-opacity': '1',
	'stroke-linecap': 'butt',
	'stroke-linejoin': 'miter',
	'stroke-dasharray': 'none',
	opacity: '1',
	'stop-color': 'rgb(0, 0, 0)',
	'stop-opacity': '1',
	'mix-blend-mode': 'normal',
	display: 'inline',
	visibility: 'visible'
};

/** Keyframe fields that describe the frame rather than a CSS property. */
const KEYFRAME_META = new Set(['offset', 'computedOffset', 'easing', 'composite']);

const kebab = (prop: string) => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function keyframesCss(frames: ComputedKeyframe[]): string {
	return frames
		.map((frame) => {
			const decls = Object.entries(frame)
				.filter(([prop, value]) => !KEYFRAME_META.has(prop) && value != null && value !== '')
				.map(([prop, value]) => `${kebab(prop)}:${value}`);
			// Linear is what the element's own timing function already covers.
			if (frame.easing && frame.easing !== 'linear') {
				decls.push(`animation-timing-function:${frame.easing}`);
			}
			return `${+(frame.computedOffset * 100).toFixed(3)}%{${decls.join(';')}}`;
		})
		.join('');
}

/**
 * The element's endless CSS loops as inline declarations, with their keyframes registered in
 * `keyframes`. One-shot animations (pop-in, reactions) are dropped: a file has no moment to
 * play them in. Each loop keeps its current phase, so the file starts where the page stood.
 */
function loopStyle(el: Element, cs: CSSStyleDeclaration, keyframes: Map<string, string>) {
	const names = cs.animationName.split(', ');
	const pick = (list: string, i: number) => {
		const items = list.split(/,(?![^(]*\))\s*/);
		return items[i % items.length];
	};
	const loops: string[] = [];
	for (const a of el.getAnimations()) {
		if (!(a instanceof CSSAnimation) || !(a.effect instanceof KeyframeEffect)) continue;
		const i = names.indexOf(a.animationName);
		if (i < 0 || pick(cs.animationIterationCount, i) !== 'infinite') continue;
		const body = keyframesCss(a.effect.getKeyframes());
		if (!keyframes.has(body)) keyframes.set(body, `loop${keyframes.size}`);
		// The component paces its loops through the playback rate, which a file cannot carry.
		const rate = a.playbackRate || 1;
		const duration = (a.effect.getComputedTiming().duration as number) / rate;
		// Staggered loops (hearts, notes) keep their own delay ahead of the shared clock.
		const delay = (Number(a.effect.getTiming().delay ?? 0) - Number(a.currentTime ?? 0)) / rate;
		loops.push(
			[
				keyframes.get(body),
				`${Math.round(duration)}ms`,
				pick(cs.animationTimingFunction, i),
				`${Math.round(delay)}ms`,
				'infinite',
				pick(cs.animationDirection, i)
			].join(' ')
		);
	}
	if (!loops.length) return [];
	return [
		`animation:${loops.join(',')}`,
		`transform-box:${cs.transformBox}`,
		`transform-origin:${cs.transformOrigin}`
	];
}

export function snapshotSvg(
	svg: SVGSVGElement,
	size: { width: number; height: number },
	{ animated = false } = {}
): string {
	const keyframes = new Map<string, string>();
	const clone = svg.cloneNode(true) as SVGSVGElement;
	const source = [svg, ...svg.querySelectorAll('*')];
	const target = [clone, ...clone.querySelectorAll('*')];
	source.forEach((el, i) => {
		const out = target[i];
		const cs = getComputedStyle(el);
		const parent = el === svg ? null : getComputedStyle(el.parentElement!);
		const style: string[] = [];
		for (const prop of PAINT) {
			const value = cs.getPropertyValue(prop);
			const base = parent && INHERITED.has(prop) ? parent.getPropertyValue(prop) : INITIAL[prop];
			if (!value || value === base) continue;
			// Hidden-by-animation start states (e.g. entrance fades) must not freeze into the file.
			if (prop === 'opacity' && el.getAnimations().length) continue;
			style.push(`${prop}:${value}`);
		}
		if (animated) style.push(...loopStyle(el, cs, keyframes));
		out.removeAttribute('class');
		out.removeAttribute('style');
		if (style.length) out.setAttribute('style', style.join(';'));
	});
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('width', String(Math.round(size.width)));
	clone.setAttribute('height', String(Math.round(size.height)));
	clone.removeAttribute('role');
	clone.removeAttribute('tabindex');
	if (keyframes.size) {
		const css = [...keyframes].map(([body, name]) => `@keyframes ${name}{${body}}`);
		// The file plays wherever it ends up, so it honours reduced motion on its own.
		css.push('@media (prefers-reduced-motion:reduce){*{animation:none!important}}');
		const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
		style.textContent = css.join('');
		clone.prepend(style);
	}
	return new XMLSerializer().serializeToString(clone);
}

export async function svgToPng(svgText: string, width: number, height: number, scale = 2) {
	const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png')
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function download(data: Blob | string, filename: string, type = 'text/plain') {
	const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
