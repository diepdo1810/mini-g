import type { PathRect } from '../domain/types';

export const GameBalance = {
  SCREEN: {
    WIDTH: 450,
    HEIGHT: 800
  },
  BOARD: {
    ROWS: 5,
    COLS: 5,
    CELL_SIZE: 56,
    X: 85, // (450 - 5 * 56) / 2
    Y: 160
  },
  PATH: {
    OFFSET: 20,
    get RECT(): PathRect {
      const left = GameBalance.BOARD.X - GameBalance.PATH.OFFSET;
      const right = GameBalance.BOARD.X + GameBalance.BOARD.COLS * GameBalance.BOARD.CELL_SIZE + GameBalance.PATH.OFFSET;
      const top = GameBalance.BOARD.Y - GameBalance.PATH.OFFSET;
      const bottom = GameBalance.BOARD.Y + GameBalance.BOARD.ROWS * GameBalance.BOARD.CELL_SIZE + GameBalance.PATH.OFFSET;
      return { left, top, right, bottom };
    }
  },
  HERO: {
    SIZE: 42,
    INITIAL: {
      kind: 'A' as const,
      row: 0,
      col: 2,
      tier: 0
    },
    COLORS: {
      A: 0x3b82f6, // Blue
      B: 0x10b981 // Green
    }
  },
  SWORD: {
    OFFSET_START: 14,
    LENGTH: 58, // Reaches 72 px from hero center (hitbox reaches 80 px)
    WIDTH: 8,
    HITBOX_RADIUS: 8, // Collision capsule radius
    ANGULAR_SPEED: Math.PI * 2 * 1.15, // rad/s (~1.15 rotations per sec)
    HIT_COOLDOWN_MS: 450,
    COLOR: 0xfacc15 // Golden yellow
  },
  MONSTER: {
    RADIUS: 16,
    BOSS_RADIUS: 24,
    COLOR: 0xef4444, // Red
    BOSS_COLOR: 0x7c3aed, // Purple
    BOSS_BORDER: 0xfbbf24, // Gold
    INITIAL_WAVE_SPEED: 32,
    INITIAL_HP: 3
  },
  BASE: {
    MAX_HP: 3,
    INITIAL_HP: 3
  },
  WAVES: {
    TOTAL: 5,
    SPAWN_INTERVAL: 2.5,
    INTER_WAVE_DELAY: 2.0,
    CONFIGS: [
      { monsterCount: 1, monsterHp: 3, monsterSpeed: 32 },
      { monsterCount: 2, monsterHp: 4, monsterSpeed: 34 },
      { monsterCount: 2, monsterHp: 6, monsterSpeed: 36 },
      { monsterCount: 3, monsterHp: 8, monsterSpeed: 38 },
      { monsterCount: 4, monsterHp: 12, monsterSpeed: 40 }
    ] as const
  },
  EGG: {
    INITIAL_HP: 3,
    HP_STEP: 2,
    CENTER_X: 225,
    CENTER_Y: 516,
    RADIUS_X: 32,
    RADIUS_Y: 36,
    TOUCH_PADDING: 12,
    COLOR: 0xf59e0b,
    DRAG_COOLDOWN_MS: 250,
    ORBIT_COOLDOWN_MS: 500
  },
  DRAG: {
    MIN_DISTANCE: 18,
    LINE_COLOR: 0x38bdf8,
    GHOST_ALPHA: 0.6
  },
  COMBAT: {
    MAX_DELTA_SECONDS: 0.1 // clamp lag frames
  }
} as const;

