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
  type?: 'normal' | 'boss'; // optional only for legacy fixtures; every configured spawn sets it
  escapeDamage?: number; // Base HP lost if the monster completes one lap
}

export type EggStatus = 'active' | 'pending';

export interface HatchReward {
  kind: HeroKind;
  heroTier: number;
}

export interface QueuedHatchReward {
  id: string; // Each break gets a unique immutable reward, including repeat breaks of one egg.
  eggId: string;
  slotIndex: number;
  reward: HatchReward;
  remainingSeconds: number; // Incubates while first in FIFO; <= 0 means READY.
}

export interface Egg {
  id: string;
  slotIndex: number;
  eggLevel: number;
  hp: number;
  maxHp: number;
  hatchCount: number;
  status: EggStatus;
  pendingHero: HatchReward | null;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  readyToHatch: boolean;
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

export interface WaveConfig {
  monsterCount: number;
  monsterHp: number;
  monsterSpeed: number;
}

