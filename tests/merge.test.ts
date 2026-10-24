import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { MockRandomSource } from '../src/game/domain/RandomSource';
import { GameBalance } from '../src/game/config/GameBalance';

describe('Phase 3 - Hatching, Movement & 2048 Merge', () => {
  let engine: GameEngine;
  let mockRandom: MockRandomSource;

  beforeEach(() => {
    mockRandom = new MockRandomSource([0.1]);
    engine = new GameEngine(undefined, mockRandom);
  });

  it('T07: First egg reaching 0 HP hatches Kind A tier 0 into an empty cell, resets egg to 5 HP', () => {
    const hero1 = engine.getState().heroes[0];
    expect(engine.getState().heroes.length).toBe(1);

    // Hit egg 3 times
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }

    const state = engine.getState();
    // Should have hatched a second hero!
    expect(state.heroes.length).toBe(2);
    const newHero = state.heroes[1];
    expect(newHero.kind).toBe('A');
    expect(newHero.tier).toBe(0);

    // Egg should be reset for next hatch
    expect(state.egg.hatchCount).toBe(1);
    expect(state.egg.maxHp).toBe(GameBalance.EGG.INITIAL_HP + GameBalance.EGG.HP_STEP * 1); // 3 + 2 = 5
    expect(state.egg.hp).toBe(5);
    expect(state.egg.readyToHatch).toBe(false);
  });

  it('second egg hatches random A or B based on RandomSource', () => {
    const hero1 = engine.getState().heroes[0];

    // Hatch 1st egg (always A)
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }

    // Set mock random so next() for cell is 0.0, and next() for kind is 0.7 (>= 0.5 -> 'B')
    mockRandom.setValues([0.0, 0.7]);

    // Hatch 2nd egg (5 HP)
    for (let i = 0; i < 5; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }

    const state = engine.getState();
    expect(state.heroes.length).toBe(3);
    const thirdHero = state.heroes[2];
    expect(thirdHero.kind).toBe('B');
  });

  it('T11: Moves hero to empty cell, preserving invariants', () => {
    const hero = engine.getState().heroes[0];
    expect(hero.row).toBe(0);
    expect(hero.col).toBe(2);

    // Move to (1, 1)
    engine.dispatch({ type: 'MOVE_HERO', heroId: hero.id, targetRow: 1, targetCol: 1 });

    expect(hero.row).toBe(1);
    expect(hero.col).toBe(1);
    expect(engine.getState().heroes.length).toBe(1);

    // Move out of bounds is rejected
    engine.dispatch({ type: 'MOVE_HERO', heroId: hero.id, targetRow: 5, targetCol: 1 });
    expect(hero.row).toBe(1);
    expect(hero.col).toBe(1);
  });

  it('T08: Merges two identical heroes (A0 + A0 -> A1), frees source cell', () => {
    // Hatch 1st egg so we have two A tier 0 heroes
    const hero1 = engine.getState().heroes[0];
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }

    const [h1, h2] = engine.getState().heroes;
    expect(h1.kind).toBe('A');
    expect(h2.kind).toBe('A');
    expect(h1.tier).toBe(0);
    expect(h2.tier).toBe(0);

    const h2Row = h2.row;
    const h2Col = h2.col;

    // Merge h1 into h2
    engine.dispatch({ type: 'MERGE_HERO', sourceId: h1.id, targetId: h2.id });

    const state = engine.getState();
    expect(state.heroes.length).toBe(1);
    expect(state.heroes[0].id).toBe(h2.id);
    expect(state.heroes[0].tier).toBe(1); // ATK 2
    expect(state.heroes[0].row).toBe(h2Row);
    expect(state.heroes[0].col).toBe(h2Col);
  });

  it('T09 & T10: Rejects merge if different kind or different tier', () => {
    const state = engine.getState();
    const hero1 = state.heroes[0]; // A, tier 0

    // Manually add hero with kind B and hero with tier 1 for testing
    state.heroes.push({
      id: 'hero-b',
      kind: 'B',
      row: 1,
      col: 1,
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

    // Merge A0 onto B0 -> Invalid
    engine.dispatch({ type: 'MERGE_HERO', sourceId: hero1.id, targetId: 'hero-b' });
    expect(state.heroes.length).toBe(3);
    expect(state.heroes.find((h) => h.id === 'hero-b')?.tier).toBe(0);

    // Merge A0 onto A1 -> Invalid
    engine.dispatch({ type: 'MERGE_HERO', sourceId: hero1.id, targetId: 'hero-a1' });
    expect(state.heroes.length).toBe(3);
    expect(state.heroes.find((h) => h.id === 'hero-a1')?.tier).toBe(1);
  });

  it('T12: Handles board full (25 cells) - stays readyToHatch until a merge creates space', () => {
    const state = engine.getState();
    state.heroes = [];

    // Fill all 25 cells with Kind A tier 0
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        state.heroes.push({
          id: `h-${r}-${c}`,
          kind: 'A',
          row: r,
          col: c,
          tier: 0,
          angle: 0
        });
      }
    }
    expect(state.heroes.length).toBe(25);

    // Damage egg to 0
    state.egg.hp = 1;
    engine.dispatch({ type: 'ATTACK_EGG', heroId: 'h-0-0' });

    // Board full, egg cannot hatch yet
    expect(engine.getState().egg.readyToHatch).toBe(true);
    expect(engine.getState().heroes.length).toBe(25);

    // Now merge h-0-0 into h-0-1 to free cell (0, 0)
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'h-0-0', targetId: 'h-0-1' });

    // Cell was freed -> pending hatch triggers automatically!
    const stateAfter = engine.getState();
    expect(stateAfter.heroes.length).toBe(25); // 25 - 1 (merged) + 1 (hatched) = 25
    expect(stateAfter.egg.readyToHatch).toBe(false);
    expect(stateAfter.egg.hatchCount).toBe(1);
  });
});
