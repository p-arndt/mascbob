/** Outfits for the full-body figure (`body` prop). */
export const OUTFITS = ['none'] as const;
export type Outfit = (typeof OUTFITS)[number];

/** Full-body mode draws in a 200×300 viewBox: the head keeps its 200×200 coordinates on top. */
export const BODY_VIEWBOX_HEIGHT = 300;
/** Ground line for the shadow in full-body mode. */
export const BODY_GROUND_Y = 290;
