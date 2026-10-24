import { GameBalance } from '../config/GameBalance';
import type { HeroKind } from './types';
import type { RandomSource } from './RandomSource';

export type EggStatus = 'active' | 'pending';

export interface HatchReward {
  kind: HeroKind;
  heroTier: number; // 0-based: tier 0 = ATK 1, tier 1 = ATK 2, tier 2 = ATK 4
}

export interface EggState {
  id: string;
  slotIndex: number; // 0..eggCount-1
  eggLevel: number; // 1-based (1, 2, 3...)
  hp: number;
  maxHp: number;
  hatchCount: number;
  status: EggStatus;
  pendingHero: HatchReward | null;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  readyToHatch: boolean; // backward compatibility
}

export const EGG_PROGRESSION_CONFIG = {
  maxConcurrentEggs: 5,
  eggCountByLevel: [
    { fromLevel: 1, count: 1 },
    { fromLevel: 2, count: 2 },
    { fromLevel: 4, count: 3 },
    { fromLevel: 6, count: 4 },
    { fromLevel: 11, count: 5 }
  ],
  eggLevelMilestones: [
    { completedBossLevel: 5, unlockedEggLevel: 2 },
    { completedBossLevel: 10, unlockedEggLevel: 3 },
    { completedBossLevel: 15, unlockedEggLevel: 4 }
  ],
  hatchWeightsByEggLevel: {
    1: [{ heroTier: 0, weight: 100 }],
    2: [
      { heroTier: 0, weight: 50 },
      { heroTier: 1, weight: 50 }
    ],
    3: [
      { heroTier: 0, weight: 20 },
      { heroTier: 1, weight: 60 },
      { heroTier: 2, weight: 20 }
    ]
  }
} as const;

/**
 * Returns number of concurrent eggs allowed for a given level (1..5).
 * Level 1: 1
 * Level 2–3: 2
 * Level 4–5: 3
 * Level 6–10: 4
 * Level 11+: 5 (hard cap 5)
 */
export function eggCountForLevel(levelId: number): number {
  if (levelId <= 1) return 1;
  if (levelId <= 3) return 2;
  if (levelId <= 5) return 3;
  if (levelId <= 10) return 4;
  return 5;
}

/**
 * Returns the maximum egg level allowed for a given level (level cap).
 * Prevents over-powered eggs when replaying early levels.
 * Level 1–5: max Level 1
 * Level 6–10: max Level 2
 * Level 11–15: max Level 3
 */
export function allowedEggLevelForLevel(levelId: number): number {
  if (levelId <= 5) return 1;
  if (levelId <= 10) return 2;
  if (levelId <= 15) return 3;
  return 4;
}

/**
 * Resolves the effective egg level for a match based on levelId and campaign unlock.
 */
export function resolveEggLevel(levelId: number, highestUnlockedEggLevel: number): number {
  const allowed = allowedEggLevelForLevel(levelId);
  return Math.max(1, Math.min(highestUnlockedEggLevel, allowed));
}

/**
 * Calculates max HP for an egg:
 * baseHp(eggLevel) = 3 + 2 * (eggLevel - 1)
 * maxHp = baseHp(eggLevel) + 2 * hatchCount
 */
export function calculateEggMaxHp(eggLevel: number, hatchCount: number): number {
  const baseHp = 3 + 2 * (eggLevel - 1);
  return baseHp + 2 * hatchCount;
}

/**
 * Rolls a hatch reward based on egg level and injected random source.
 * Egg Level 1: 100% tier 0
 * Egg Level 2: 50% tier 0, 50% tier 1
 * Egg Level 3: 20% tier 0, 60% tier 1, 20% tier 2
 */
export function rollHatch(
  eggLevel: number,
  random: RandomSource,
  isTutorialFirstHatch: boolean = false
): HatchReward {
  if (isTutorialFirstHatch) {
    return { kind: 'A', heroTier: 0 };
  }

  // Kind is 50% A, 50% B
  const kind: HeroKind = random.next() < 0.5 ? 'A' : 'B';

  const weights =
    EGG_PROGRESSION_CONFIG.hatchWeightsByEggLevel[
      eggLevel as keyof typeof EGG_PROGRESSION_CONFIG.hatchWeightsByEggLevel
    ] ?? EGG_PROGRESSION_CONFIG.hatchWeightsByEggLevel[1];

  let heroTier: number = weights[0].heroTier;
  if (weights.length > 1) {
    const roll = random.next() * 100;
    let cumulative = 0;
    for (const entry of weights) {
      cumulative += entry.weight;
      if (roll < cumulative) {
        heroTier = entry.heroTier;
        break;
      }
    }
  }

  return { kind, heroTier };
}

/**
 * Calculates (x, y, radiusX, radiusY) layout for N eggs evenly spaced below the board.
 */
export function calculateEggPositions(
  eggCount: number
): Array<{ x: number; y: number; radiusX: number; radiusY: number }> {
  const count = Math.max(1, Math.min(5, eggCount));
  const y = GameBalance.EGG.CENTER_Y; // 516

  // For 1..3 eggs, standard radius 28x32
  // For 4..5 eggs, slightly more compact 22x26 to ensure no touch overlap
  let radiusX = 28;
  let radiusY = 32;

  if (count === 1) {
    radiusX = GameBalance.EGG.RADIUS_X;
    radiusY = GameBalance.EGG.RADIUS_Y;
    return [{ x: GameBalance.EGG.CENTER_X, y, radiusX, radiusY }];
  }

  if (count >= 4) {
    radiusX = 22;
    radiusY = 26;
  }

  const step = GameBalance.SCREEN.WIDTH / (count + 1);
  const positions: Array<{ x: number; y: number; radiusX: number; radiusY: number }> = [];

  for (let i = 0; i < count; i++) {
    const x = Math.round(step * (i + 1));
    positions.push({ x, y, radiusX, radiusY });
  }

  return positions;
}

/**
 * Creates initial EggState array for a given level and unlocked egg level.
 */
export function createEggsForLevel(
  levelId: number,
  highestUnlockedEggLevel: number = 1
): EggState[] {
  const count = eggCountForLevel(levelId);
  const effectiveLevel = resolveEggLevel(levelId, highestUnlockedEggLevel);
  const initialMaxHp = calculateEggMaxHp(effectiveLevel, 0);
  const positions = calculateEggPositions(count);

  return positions.map((pos, index) => ({
    id: `egg-${index + 1}`,
    slotIndex: index,
    eggLevel: effectiveLevel,
    hp: initialMaxHp,
    maxHp: initialMaxHp,
    hatchCount: 0,
    status: 'active',
    pendingHero: null,
    x: pos.x,
    y: pos.y,
    radiusX: pos.radiusX,
    radiusY: pos.radiusY,
    readyToHatch: false
  }));
}
