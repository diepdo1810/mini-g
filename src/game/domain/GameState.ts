import type { Hero, Monster, Egg, DamageNumber } from './types';
import { GameBalance } from '../config/GameBalance';

export interface NotificationMessage {
  text: string;
  color: string;
  life: number;
}

export interface GameState {
  heroes: Hero[];
  monsters: Monster[];
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
}

export function createInitialState(): GameState {
  return {
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
    monsters: [
      {
        id: 'monster-1',
        hp: GameBalance.MONSTER.INITIAL_HP,
        maxHp: GameBalance.MONSTER.INITIAL_HP,
        progress: 0,
        speed: GameBalance.MONSTER.INITIAL_WAVE_SPEED
      }
    ],
    egg: {
      id: 'egg-1',
      hp: GameBalance.EGG.INITIAL_HP,
      maxHp: GameBalance.EGG.INITIAL_HP,
      hatchCount: 0,
      readyToHatch: false
    },
    baseHp: GameBalance.BASE.INITIAL_HP,
    maxBaseHp: GameBalance.BASE.MAX_HP,
    kills: 0,
    wave: 1,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    damageNumbers: []
  };
}

