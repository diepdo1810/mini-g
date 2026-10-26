import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Core: {
      Events: {
        BLUR: 'blur'
      }
    }
  }
}));

import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { DragController } from '../src/game/input/DragController';
import { getLevelConfig } from '../src/game/config/levels';
import type { RandomSource } from '../src/game/domain/RandomSource';

const mockRandom: RandomSource = {
  next: () => 0.1,
  choose: <T>(arr: T[]) => arr[0]
};

describe('Issue #25 - Tap-to-Select and Tap-to-Merge Logic', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
  });

  it('selects hero on SELECT_HERO and clears selection when requested', () => {
    const hero1 = engine.getState().heroes[0];

    engine.dispatch({ type: 'SELECT_HERO', heroId: hero1.id });
    expect(engine.getState().selectedHeroId).toBe(hero1.id);

    engine.dispatch({ type: 'SELECT_HERO', heroId: undefined });
    expect(engine.getState().selectedHeroId).toBeUndefined();
  });

  it('merges two compatible heroes via MERGE_HERO and upgrades target tier', () => {
    const state = engine.getState();
    const hero1 = state.heroes[0]; // A0 at (0, 2)

    // Add another A0 at (1, 2)
    state.heroes.push({
      id: 'hero-2',
      kind: 'A',
      row: 1,
      col: 2,
      tier: 0,
      angle: 0
    });

    expect(state.heroes).toHaveLength(2);

    // Merge hero1 into hero-2
    engine.dispatch({ type: 'MERGE_HERO', sourceId: hero1.id, targetId: 'hero-2' });

    expect(state.heroes).toHaveLength(1);
    expect(state.heroes[0].id).toBe('hero-2');
    expect(state.heroes[0].tier).toBe(1); // upgraded to tier 1 (ATK 2)
    expect(state.heroes[0].row).toBe(1);
    expect(state.heroes[0].col).toBe(2);
  });

  it('rejects merge between incompatible heroes (different kind or different tier)', () => {
    const state = engine.getState();
    const heroA = state.heroes[0]; // A0

    // Add B0 and A1
    state.heroes.push({
      id: 'hero-b0',
      kind: 'B',
      row: 1,
      col: 2,
      tier: 0,
      angle: 0
    });
    state.heroes.push({
      id: 'hero-a1',
      kind: 'A',
      row: 2,
      col: 2,
      tier: 1,
      angle: 0
    });

    // Attempt merge A0 into B0 -> rejected
    engine.dispatch({ type: 'MERGE_HERO', sourceId: heroA.id, targetId: 'hero-b0' });
    expect(state.heroes).toHaveLength(3);
    expect(state.heroes.find((h) => h.id === 'hero-b0')?.tier).toBe(0);

    // Attempt merge A0 into A1 -> rejected
    engine.dispatch({ type: 'MERGE_HERO', sourceId: heroA.id, targetId: 'hero-a1' });
    expect(state.heroes).toHaveLength(3);
    expect(state.heroes.find((h) => h.id === 'hero-a1')?.tier).toBe(1);
  });

  it('clears selectedHeroId when paused or restarting', () => {
    const hero1 = engine.getState().heroes[0];
    engine.dispatch({ type: 'SELECT_HERO', heroId: hero1.id });
    expect(engine.getState().selectedHeroId).toBe(hero1.id);

    // Restart clears selection
    engine.dispatch({ type: 'RESTART' });
    expect(engine.getState().selectedHeroId).toBeUndefined();
  });

  it('rejects moved gestures starting from empty cell or outside board as tap merge in DragController', () => {
    const mockScene = {
      input: { on: () => {}, off: () => {} },
      game: { events: { on: () => {}, off: () => {} } },
      add: {
        graphics: () => ({
          clear: () => {},
          destroy: () => {},
          lineStyle: () => {},
          strokeRoundedRect: () => {},
          strokeRect: () => {},
          fillStyle: () => {},
          fillRoundedRect: () => {},
          lineBetween: () => {}
        })
      }
    };

    const state = engine.getState();
    const hero1 = state.heroes[0]; // A0 at (0, 2)
    // Add compatible A0 at (1, 2)
    state.heroes.push({
      id: 'hero-2',
      kind: 'A',
      row: 1,
      col: 2,
      tier: 0,
      angle: 0
    });

    const controller = new DragController(mockScene as any, engine);

    // 1. Select hero1
    engine.dispatch({ type: 'SELECT_HERO', heroId: hero1.id });
    expect(engine.getState().selectedHeroId).toBe(hero1.id);

    // 2. Simulate swipe starting at empty cell (row 3, col 3)
    const { X, Y, CELL_SIZE } = GameBalance.BOARD;
    const startX = X + 3.5 * CELL_SIZE;
    const startY = Y + 3.5 * CELL_SIZE;

    // Pointer down on empty cell
    controller['onPointerDown']({ x: startX, y: startY } as any);

    // Pointer moves towards hero-2 (row 1, col 2)
    const endX = X + 2.5 * CELL_SIZE;
    const endY = Y + 1.5 * CELL_SIZE;
    controller['onPointerMove']({ x: endX, y: endY } as any);

    // Pointer up on hero-2
    controller['onPointerUp']({ x: endX, y: endY } as any);

    // MUST NOT merge because gesture moved beyond tap threshold!
    expect(state.heroes).toHaveLength(2);
    expect(state.heroes.find((h: any) => h.id === 'hero-2')?.tier).toBe(0);

    // 3. Simulate swipe starting outside the board onto hero-2
    engine.dispatch({ type: 'SELECT_HERO', heroId: hero1.id });
    const outsideX = 10;
    const outsideY = 10;
    controller['onPointerDown']({ x: outsideX, y: outsideY } as any);
    controller['onPointerMove']({ x: endX, y: endY } as any);
    controller['onPointerUp']({ x: endX, y: endY } as any);

    // MUST NOT merge because gesture moved from outside board beyond tap threshold!
    expect(state.heroes).toHaveLength(2);
    expect(state.heroes.find((h: any) => h.id === 'hero-2')?.tier).toBe(0);

    // 4. Now simulate a clean TAP on hero-2 (movement = 0)
    controller['onPointerDown']({ x: endX, y: endY } as any);
    // Hero 1 re-selected if was cleared by swipe
    engine.dispatch({ type: 'SELECT_HERO', heroId: hero1.id });
    controller['onPointerUp']({ x: endX, y: endY } as any);

    // Clean tap DOES merge
    expect(state.heroes).toHaveLength(1);
    expect(state.heroes[0].id).toBe('hero-2');
    expect(state.heroes[0].tier).toBe(1);
  });
});
