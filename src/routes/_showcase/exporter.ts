/**
 * Static exports of a live mascot. The component styles itself through scoped CSS and
 * custom properties, which a standalone file does not have, so the snapshot bakes the
 * computed paint of every element into attributes. CSS transforms are left out on
 * purpose: they are the idle animations, and the rest pose is what an export should show.
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

export function snapshotSvg(svg: SVGSVGElement, size: { width: number; height: number }): string {
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
		out.removeAttribute('class');
		out.removeAttribute('style');
		if (style.length) out.setAttribute('style', style.join(';'));
	});
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('width', String(Math.round(size.width)));
	clone.setAttribute('height', String(Math.round(size.height)));
	clone.removeAttribute('role');
	clone.removeAttribute('tabindex');
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
