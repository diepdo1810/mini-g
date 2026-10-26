import type { Hero, Monster, Egg, DamageNumber, QueuedHatchReward } from './types';
import { GameBalance } from '../config/GameBalance';
import { createEggsForLevel } from './EggProgression';

export interface NotificationMessage {
  text: string;
  color: string;
  life: number;
}

export interface GameState {
  currentLevelId: number;
  totalWaves: number;
  heroes: Hero[];
  monsters: Monster[];
  eggs: Egg[];
  egg: Egg;
  baseHp: number;
  maxBaseHp: number;
  kills: number;
  wave: number;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  damageNumbers: DamageNumber[];
  notification?: NotificationMessage;
  hatchQueue: QueuedHatchReward[];
  mergeGraceRemaining: number;
  interWaveCountdown?: number;
  selectedHeroId?: string;
}

export function createInitialState(
  levelId = 1,
  totalWaves = 3,
  highestUnlockedEggLevel = 1
): GameState {
  const initialEggs = createEggsForLevel(levelId, highestUnlockedEggLevel);

  const state: GameState = {
    currentLevelId: levelId,
    totalWaves,
    heroes: [
      {
        id: 'hero-1',
        kind: GameBalance.HERO.INITIAL.kind,
        row: GameBalance.HERO.INITIAL.row,
        col: GameBalance.HERO.INITIAL.col,
        tier: GameBalance.HERO.INITIAL.tier,
        angle: 0
      }
    ],
    monsters: [],
    eggs: initialEggs,
    get egg(): Egg {
      return this.eggs[0];
    },
    set egg(val: Egg) {
      if (this.eggs && this.eggs.length > 0) {
        this.eggs[0] = val;
      } else {
        this.eggs = [val];
      }
    },
    baseHp: GameBalance.BASE.INITIAL_HP,
    maxBaseHp: GameBalance.BASE.MAX_HP,
    kills: 0,
    wave: 1,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    damageNumbers: [],
    hatchQueue: [],
    mergeGraceRemaining: 0
  };

  return state;
}

