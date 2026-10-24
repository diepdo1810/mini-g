export type EnemyType = 'normal' | 'boss';

export interface EnemySpawnConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  escapeDamage: number;
}

export interface WaveConfig {
  spawnIntervalMs: number;
  enemies: EnemySpawnConfig[];
}

export interface LevelConfig {
  id: number;
  baseHP: number;
  waves: WaveConfig[];
  isBossLevel: boolean;
}

export interface LevelResult {
  bestStars: 0 | 1 | 2 | 3;
  bestKills: number;
}

export interface CampaignProgress {
  schemaVersion: 1;
  highestUnlockedLevel: number; // 1..10
  highestUnlockedEggLevel?: number; // 1..3
  results: Record<number, LevelResult>;
}

function createEnemies(count: number, hp: number, speed: number, escapeDamage = 1): EnemySpawnConfig[] {
  return Array.from({ length: count }, () => ({
    type: 'normal',
    hp,
    speed,
    escapeDamage
  }));
}

function createWave(enemies: EnemySpawnConfig[], spawnIntervalMs = 2500): WaveConfig {
  return {
    spawnIntervalMs,
    enemies
  };
}

export const LEVELS: readonly LevelConfig[] = [
  // Level 1: 3 waves (1 / 2 / 2 quái thường, HP 3 / 4 / 5, speed 32 px/s)
  {
    id: 1,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(1, 3, 32)),
      createWave(createEnemies(2, 4, 32)),
      createWave(createEnemies(2, 5, 32))
    ]
  },
  // Level 2: 3 waves (2 / 2 / 3, HP 4 / 5 / 6, speed 33)
  {
    id: 2,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(2, 4, 33)),
      createWave(createEnemies(2, 5, 33)),
      createWave(createEnemies(3, 6, 33))
    ]
  },
  // Level 3: 4 waves (2 / 2 / 3 / 3, HP 4 / 5 / 6 / 7, speed 34)
  {
    id: 3,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(2, 4, 34)),
      createWave(createEnemies(2, 5, 34)),
      createWave(createEnemies(3, 6, 34)),
      createWave(createEnemies(3, 7, 34))
    ]
  },
  // Level 4: 4 waves (2 / 3 / 3 / 4, HP 5 / 6 / 7 / 8, speed 35)
  {
    id: 4,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(2, 5, 35)),
      createWave(createEnemies(3, 6, 35)),
      createWave(createEnemies(3, 7, 35)),
      createWave(createEnemies(4, 8, 35))
    ]
  },
  // Level 5: 5 waves, wave 5 has 2 normal + Boss (HP 40, speed 27, escapeDamage 2)
  {
    id: 5,
    baseHP: 3,
    isBossLevel: true,
    waves: [
      createWave(createEnemies(2, 5, 35)),
      createWave(createEnemies(3, 6, 35)),
      createWave(createEnemies(3, 7, 35)),
      createWave(createEnemies(4, 8, 35)),
      createWave([
        ...createEnemies(2, 9, 35),
        { type: 'boss', hp: 40, speed: 27, escapeDamage: 2 }
      ])
    ]
  },
  // Level 6: 4 waves (3 / 3 / 4 / 4, HP 6 / 7 / 8 / 10, speed 36)
  {
    id: 6,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(3, 6, 36)),
      createWave(createEnemies(3, 7, 36)),
      createWave(createEnemies(4, 8, 36)),
      createWave(createEnemies(4, 10, 36))
    ]
  },
  // Level 7: 4 waves (3 / 4 / 4 / 5, HP 7 / 8 / 10 / 11, speed 37)
  {
    id: 7,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(3, 7, 37)),
      createWave(createEnemies(4, 8, 37)),
      createWave(createEnemies(4, 10, 37)),
      createWave(createEnemies(5, 11, 37))
    ]
  },
  // Level 8: 4 waves (4 / 4 / 5 / 5, HP 8 / 10 / 11 / 12, speed 38)
  {
    id: 8,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(4, 8, 38)),
      createWave(createEnemies(4, 10, 38)),
      createWave(createEnemies(5, 11, 38)),
      createWave(createEnemies(5, 12, 38))
    ]
  },
  // Level 9: 4 waves (4 / 5 / 5 / 6, HP 9 / 11 / 12 / 14, speed 39)
  {
    id: 9,
    baseHP: 3,
    isBossLevel: false,
    waves: [
      createWave(createEnemies(4, 9, 39)),
      createWave(createEnemies(5, 11, 39)),
      createWave(createEnemies(5, 12, 39)),
      createWave(createEnemies(6, 14, 39))
    ]
  },
  // Level 10: 5 waves, wave 5 has 3 normal + Boss (HP 85, speed 29, escapeDamage 2)
  {
    id: 10,
    baseHP: 3,
    isBossLevel: true,
    waves: [
      createWave(createEnemies(4, 10, 40)),
      createWave(createEnemies(5, 12, 40)),
      createWave(createEnemies(5, 14, 40)),
      createWave(createEnemies(6, 16, 40)),
      createWave([
        ...createEnemies(3, 18, 40),
        { type: 'boss', hp: 85, speed: 29, escapeDamage: 2 }
      ])
    ]
  }
];

export function getLevelConfig(id: number): LevelConfig {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) {
    throw new Error(`Level ${id} does not exist. Valid levels: 1..${LEVELS.length}`);
  }
  return level;
}

