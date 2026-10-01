import { SHAPE_DEFS, clamp, type ShapeDef } from './geometry.js';
import { buildDef, type Build, type BuildDef } from './parts/body.js';
import type { Shape } from './types.js';

export const SPECIES = ['bob', 'critter', 'moss', 'wisp'] as const;
export type Species = (typeof SPECIES)[number];
export const PROPORTION_KEYS = ['head', 'body', 'height', 'arms', 'legs', 'ears', 'tail'] as const;
export const PROPORTION_RANGE = { min: 0.4, max: 1.8 } as const;
/** Multipliers relative to the species/build. Values are limited to 0.4–1.8; omitted values are 1. */
export type Proportions = Partial<Record<(typeof PROPORTION_KEYS)[number], number>>;

export function resolveProportions(input: Proportions = {}) {
	return Object.fromEntries(
		PROPORTION_KEYS.map((key) => {
			const value = input[key];
			return [
				key,
				typeof value === 'number' && Number.isFinite(value)
					? clamp(value, PROPORTION_RANGE.min, PROPORTION_RANGE.max)
					: 1
			];
		})
	) as Record<(typeof PROPORTION_KEYS)[number], number>;
}

/** Resolve geometry once so drawing, gaze, shadows and dragging use the same dimensions. */
export function creatureGeometry(
	species: Species,
	shape: Shape,
	build: Build | undefined,
	input?: Proportions,
	body = true
): { head: ShapeDef; build: BuildDef } {
	const p = resolveProportions(body ? input : { ears: input?.ears });
	const unified = species === 'moss' || species === 'wisp';
	const base = buildDef(
		unified ? 'blob' : (build ?? (species === 'critter' ? 'chibi' : 'standard'))
	);
	const hipY = base.torsoTop + (base.hipY - base.torsoTop) * p.height;
	const groundY = base.legs ? hipY + (base.groundY - base.hipY) * p.legs : hipY;
	const b: BuildDef = {
		...base,
		hipY,
		groundY,
		viewHeight: groundY + 26,
		shoulderY: base.torsoTop + (base.shoulderY - base.torsoTop) * p.height,
		upperArm: base.upperArm * p.arms,
		forearm: base.forearm * p.arms,
		headScale: base.headScale * p.head,
		torso: {
			...base.torso,
			ratio: base.torso.ratio * p.body,
			max: base.torso.max * p.body,
			bellyY: base.torsoTop + (base.torso.bellyY - base.torsoTop) * p.height
		}
	};
	if (species === 'bob') return { head: SHAPE_DEFS[shape] ?? SHAPE_DEFS.capsule, build: b };
	if (species === 'critter')
		return {
			head: {
				...SHAPE_DEFS.pebble,
				d: 'M100 46C138 46 160 70 160 106C164 122 158 140 145 146C134 166 66 166 55 146C42 140 36 122 40 106C40 70 62 46 100 46Z',
				top: 46,
				bottom: 162,
				halfWidth: 60,
				crownHalfWidth: 43
			},
			build: b
		};
	// Upper and lower contours have independent sizes; never scale the face with the whole body.
	const bottom = body ? 140 + 84 * p.height : 170;
	const top = 100 - (44 + 16 * p.head);
	// Keep enough room for every eye style and gaze even at the smallest crown.
	const faceHw = (species === 'moss' ? 44 : 55) * (0.8 + p.head * 0.2);
	const hw = (species === 'moss' ? 60 : 55) * p.body;
	const shoulder = (faceHw + hw) / 2;
	const tail = 34 * p.tail;
	const mossShoulder = bottom - 30;
	const wispRight = bottom - 35;
	const wispLeft = bottom - 45;
	const d =
		species === 'moss'
			? `M100 ${top}C${100 + faceHw * 0.8} ${top} ${100 + faceHw} 75 ${100 + faceHw} 106C${100 + faceHw} ${Math.min(138, mossShoulder - 12)} ${100 + hw} ${Math.min(146, mossShoulder - 6)} ${100 + hw} ${mossShoulder}C${100 + hw} ${bottom - 8} ${100 + hw * 0.55} ${bottom} 100 ${bottom}C${100 - hw * 0.55} ${bottom} ${100 - hw} ${bottom - 8} ${100 - hw} ${mossShoulder}C${100 - hw} ${Math.min(146, mossShoulder - 6)} ${100 - faceHw} ${Math.min(138, mossShoulder - 12)} ${100 - faceHw} 106C${100 - faceHw} 75 ${100 - faceHw * 0.8} ${top} 100 ${top}Z`
			: `M100 ${top}C${100 + faceHw * 0.8} ${top} ${100 + faceHw} 68 ${100 + faceHw} 106C${100 + faceHw} ${Math.min(141, 106 + (wispRight - 106) * 0.35)} ${100 + hw} ${Math.max(bottom - 60, 106 + (wispRight - 106) * 0.7)} ${100 + hw * 0.65} ${wispRight}C${100 + hw * 0.35} ${bottom - 13} ${100 + tail * 0.25} ${bottom - 8} ${100 + tail} ${bottom}C${100 + hw * 0.1} ${bottom + 4} ${100 - hw} ${bottom - 7} ${100 - hw} ${wispLeft}C${100 - hw} ${Math.max(bottom - 75, 106 + (wispLeft - 106) * 0.7)} ${100 - faceHw} ${Math.min(139, 106 + (wispLeft - 106) * 0.35)} ${100 - faceHw} 106C${100 - faceHw} 68 ${100 - faceHw * 0.8} ${top} 100 ${top}Z`;
	return {
		head: {
			d,
			top,
			bottom,
			halfWidth: faceHw,
			handHalfWidth: shoulder,
			crownHalfWidth: faceHw * 0.65
		},
		build: {
			...b,
			legs: false,
			motion: species === 'wisp' ? 'float' : 'stand',
			headScale: 1,
			hipY: bottom,
			groundY: bottom + (species === 'moss' && body ? 12 : 0),
			viewHeight: bottom + (species === 'moss' ? 38 : 28)
		}
	};
}

/** Extra space for large heads and ears, without moving any drawing/drag coordinates. */
export function creatureViewTop(
	species: Species,
	head: ShapeDef,
	build: BuildDef,
	input?: Proportions
): number {
	const p = resolveProportions(input);
	if (p.head <= 1 && (species !== 'critter' || p.ears <= 1)) return 0;
	const artTop = Math.min(head.top - 32, species === 'critter' ? 61 - 50 * p.ears : head.top);
	return Math.min(
		0,
		Math.floor(head.bottom + build.headY + (artTop - head.bottom) * build.headScale - 8)
	);
}
