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
    // Keep tests about player actions independent of automatic orbit egg hits.
    engine.getHeroCenter = () => ({ x: 225, y: 300 });
  });

  it('T07: First egg reaching 0 HP hatches Kind A tier 0 into an empty cell, resets egg to 5 HP', () => {
    const hero1 = engine.getState().heroes[0];
    expect(engine.getState().heroes.length).toBe(1);

    // Hit egg 3 times then wait for automatic incubation
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }
    for (let t = 0; t < 26; t++) engine.tick(0.1);

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
    for (let t = 0; t < 26; t++) engine.tick(0.1);

    // Set mock random so rollHatch kind is 0.7 (>= 0.5 -> 'B'), and cell choose is 0.0
    mockRandom.setValues([0.7, 0.0]);

    // No manual claim/cooldown; allow original queued hatch to settle
    for (let t = 0; t < 26; t++) engine.tick(0.1);

    // Hatch 2nd egg (5 HP)
    for (let i = 0; i < 5; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }
    for (let t = 0; t < 26; t++) engine.tick(0.1);

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
    for (let t = 0; t < 26; t++) engine.tick(0.1);

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

  it('T12: full board preserves READY reward until two merges free a reserve cell', () => {
    const state = engine.getState();
    state.heroes = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        state.heroes.push({
          id: `h-${row}-${col}`, kind: 'A', row, col, tier: 0, angle: 0
        });
      }
    }
    expect(state.heroes).toHaveLength(25);
    state.egg.hp = 1;
    engine.dispatch({ type: 'ATTACK_EGG', heroId: 'h-0-0' });
    expect(state.egg.readyToHatch).toBe(false);
    expect(state.egg.hp).toBe(5);
    expect(state.hatchQueue).toHaveLength(1);

    for (let t = 0; t < 30; t++) engine.tick(0.1);
    expect(state.hatchQueue[0].remainingSeconds).toBe(0);
    expect(state.heroes).toHaveLength(25);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'h-0-0', targetId: 'h-0-1' });
    for (let t = 0; t < 10; t++) engine.tick(0.1);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(1);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'h-1-0', targetId: 'h-1-1' });
    for (let t = 0; t < 7; t++) engine.tick(0.1);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(0);
    expect(state.egg.hatchCount).toBe(1);
  });
});
