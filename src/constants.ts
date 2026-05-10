export const BRANCHES = [
  'Barrio Norte',
  'Barrio Sur',
  'Mercato',
  'Perón',
  'Centro'
] as const;

export type Branch = typeof BRANCHES[number];
