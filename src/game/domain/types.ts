export type HeroKind = 'A' | 'B';

export interface Hero {
  id: string;
  kind: HeroKind;
  row: number; // 0..4
  col: number; // 0..4
  tier: number; // 0 -> ATK 1, 1 -> ATK 2, 2 -> ATK 4, ...
  angle: number; // radians
}

export interface Monster {
  id: string;
  hp: number;
  maxHp: number;
  progress: number; // distance traveled in px on perimeter
  speed: number; // px/s
}

export interface Egg {
  hp: number;
  maxHp: number;
  hatchCount: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PathRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  amount: number;
  life: number; // seconds remaining
  maxLife: number;
}
