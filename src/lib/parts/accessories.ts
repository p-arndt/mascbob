export const ACCESSORIES = ['ring', 'halo', 'antenna', 'ears', 'sprout', 'headphones'] as const;
export type Accessory = (typeof ACCESSORIES)[number];
