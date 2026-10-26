import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
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
});
