import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { getLevelConfig } from '../src/game/config/levels';
import type { RandomSource } from '../src/game/domain/RandomSource';

const random: RandomSource = {
  next: () => 0.25,
  choose: <T>(items: readonly T[]) => items[0]
};

function breakFirstEgg(engine: GameEngine): void {
  const state = engine.getState();
  state.eggs[0].hp = 1;
  expect(engine.applyEggDamage(state.heroes[0], state.eggs[0].id, 'drag')).toBe(true);
}

describe('Issue #25 - pacing timers under low frame rates', () => {
  it('incubates in 2.5 elapsed seconds, not 25 clamped simulation ticks', () => {
    const engine = new GameEngine(undefined, random, getLevelConfig(1));
    const state = engine.getState();
    breakFirstEgg(engine);

    for (let i = 0; i < 4; i++) engine.tick(0.5);
    expect(state.heroes).toHaveLength(1);
    expect(state.hatchQueue[0].remainingSeconds).toBeCloseTo(0.5, 5);

    engine.tick(0.5);
    expect(state.heroes).toHaveLength(2);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('honors 0.6s post-merge grace using elapsed time while preserving a free cell', () => {
    const engine = new GameEngine(undefined, random, getLevelConfig(1));
    const state = engine.getState();
    state.heroes = Array.from({ length: 24 }, (_, index) => ({
      id: `fixture-${index}`,
      kind: 'A' as const,
      row: Math.floor(index / 5),
      col: index % 5,
      tier: 0,
      angle: 0
    }));
    // Isolate queue behavior from sword/egg collisions.
    engine.getHeroCenter = () => ({ x: 225, y: 300 });
    breakFirstEgg(engine);
    for (let i = 0; i < 5; i++) engine.tick(0.5);
    expect(state.hatchQueue[0].remainingSeconds).toBe(0);
    expect(state.heroes).toHaveLength(24);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'fixture-0', targetId: 'fixture-1' });
    expect(state.heroes).toHaveLength(23);
    engine.tick(0.5);
    expect(state.heroes).toHaveLength(23);
    expect(state.mergeGraceRemaining).toBeCloseTo(0.1, 5);
    engine.tick(0.1);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('advances a four-second inter-wave preparation timer by elapsed time', () => {
    const engine = new GameEngine(undefined, random, getLevelConfig(1));
    const state = engine.getState();
    state.monsters[0].hp = 0;
    engine.tick(1);
    expect(state.wave).toBe(1);
    expect(state.interWaveCountdown).toBeCloseTo(3, 5);

    engine.dispatch({ type: 'PAUSE' });
    engine.tick(5);
    expect(state.interWaveCountdown).toBeCloseTo(3, 5);
    engine.dispatch({ type: 'RESUME' });

    engine.tick(1);
    engine.tick(1);
    engine.tick(1);
    expect(state.wave).toBe(2);
    expect(state.interWaveCountdown).toBeUndefined();
  });
});
