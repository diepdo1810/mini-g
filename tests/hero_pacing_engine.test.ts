import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { getLevelConfig } from '../src/game/config/levels';
import type { RandomSource } from '../src/game/domain/RandomSource';

const mockRandom: RandomSource = {
  next: () => 0.25,
  choose: <T>(arr: readonly T[]) => arr[0]
};

function advance(engine: GameEngine, ticks: number): void {
  for (let i = 0; i < ticks; i++) engine.tick(0.1);
}

function breakEgg(engine: GameEngine, index = 0): void {
  const state = engine.getState();
  const egg = state.eggs[index];
  egg.hp = 1;
  expect(engine.applyEggDamage(state.heroes[0], egg.id, 'drag')).toBe(true);
}

function fillBoard(engine: GameEngine, count: number): void {
  const state = engine.getState();
  state.heroes = Array.from({ length: count }, (_, index) => ({
    id: `fixture-${index}`,
    kind: 'A' as const,
    row: Math.floor(index / 5),
    col: index % 5,
    tier: 0,
    angle: 0
  }));
  // Prevent incidental orbit damage in pure queue/board-space tests.
  engine.getHeroCenter = () => ({ x: 225, y: 300 });
}

describe('Issue #25 - Auto Hatch + Reserve Queue', () => {
  it('resets broken egg immediately without requiring any claim, while hero incubates', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    breakEgg(engine);

    expect(state.eggs[0].status).toBe('active');
    expect(state.eggs[0].readyToHatch).toBe(false);
    expect(state.eggs[0].pendingHero).toBeNull();
    expect(state.eggs[0].hatchCount).toBe(1);
    expect(state.eggs[0].hp).toBe(5);
    expect(state.heroes).toHaveLength(1);
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.hatchQueue[0].reward).toEqual({ kind: 'A', heroTier: 0 });
    expect(state.hatchQueue[0].remainingSeconds).toBe(2.5);
  });

  it('incubates for 2.5s, then auto-spawns one hero; tutorial hero stays at (4,2)', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 24);
    expect(state.heroes).toHaveLength(1);
    expect(state.hatchQueue[0].remainingSeconds).toBeGreaterThan(0);
    advance(engine, 2);

    expect(state.heroes).toHaveLength(2);
    expect(state.heroes[1].kind).toBe('A');
    expect(state.heroes[1].tier).toBe(0);
    expect([state.heroes[1].row, state.heroes[1].col]).toEqual([4, 2]);
    expect(state.hatchQueue).toHaveLength(0);
    expect(state.eggs[0].hp).toBe(5);
  });

  it('supports multiple rewards from the same egg without blocking its replacement', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 3); // drag cooldown ends; first reward still incubating
    breakEgg(engine);

    expect(state.eggs[0].hatchCount).toBe(2);
    expect(state.eggs[0].hp).toBe(7);
    expect(state.hatchQueue).toHaveLength(2);
    expect(state.hatchQueue.map((q) => q.id)).toEqual(['hatch-1', 'hatch-2']);
    expect(state.hatchQueue.map((q) => q.eggId)).toEqual(['egg-1', 'egg-1']);
    expect(state.heroes).toHaveLength(1);

    advance(engine, 23);
    expect(state.heroes).toHaveLength(2);
    expect(state.hatchQueue).toHaveLength(1);
    advance(engine, 26);
    expect(state.heroes).toHaveLength(3);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('queues simultaneous breaks in deterministic FIFO order; never multi-spawns per tick', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();
    for (let index = 0; index < 4; index++) breakEgg(engine, index);

    expect(state.hatchQueue.map((q) => q.eggId)).toEqual(['egg-1', 'egg-2', 'egg-3', 'egg-4']);
    expect(state.hatchQueue.map((q) => q.id)).toEqual(['hatch-1', 'hatch-2', 'hatch-3', 'hatch-4']);
    expect(state.hatchQueue.every((q) => q.remainingSeconds === 2.5)).toBe(true);
    expect(state.eggs.every((e) => e.status === 'active' && e.hatchCount === 1)).toBe(true);

    advance(engine, 26);
    expect(state.heroes).toHaveLength(2);
    expect(state.hatchQueue).toHaveLength(3);
    expect(state.hatchQueue[0].remainingSeconds).toBe(2.5);
    advance(engine, 26);
    expect(state.heroes).toHaveLength(3);
    advance(engine, 52);
    expect(state.heroes).toHaveLength(5);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('holds READY rewards at 24 heroes, preserving one empty cell', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    fillBoard(engine, 24);
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 30);
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.hatchQueue[0].remainingSeconds).toBe(0);
    expect(state.heroes).toHaveLength(24);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'fixture-0', targetId: 'fixture-1' });
    expect(state.heroes).toHaveLength(23);
    advance(engine, 4);
    expect(state.heroes).toHaveLength(23);
    advance(engine, 3);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('holds rewards on a full 25-slot board even after one merge', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    fillBoard(engine, 25);
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 30);
    expect(state.heroes).toHaveLength(25);
    expect(state.hatchQueue[0].remainingSeconds).toBe(0);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'fixture-0', targetId: 'fixture-1' });
    advance(engine, 10);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(1);
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'fixture-2', targetId: 'fixture-3' });
    advance(engine, 7);
    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('does not change incubation while paused, defeated or victorious', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 7);
    const remaining = state.hatchQueue[0].remainingSeconds;

    engine.dispatch({ type: 'PAUSE' });
    advance(engine, 50);
    expect(state.hatchQueue[0].remainingSeconds).toBe(remaining);
    engine.dispatch({ type: 'RESUME' });
    state.isGameOver = true;
    advance(engine, 50);
    expect(state.hatchQueue[0].remainingSeconds).toBe(remaining);
    state.isGameOver = false;
    state.isVictory = true;
    advance(engine, 50);
    expect(state.hatchQueue[0].remainingSeconds).toBe(remaining);
  });

  it('clears rewards and timers on restart', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    breakEgg(engine);
    advance(engine, 9);
    expect(engine.getState().hatchQueue).toHaveLength(1);
    engine.dispatch({ type: 'RESTART' });
    const state = engine.getState();
    expect(state.hatchQueue).toHaveLength(0);
    expect(state.mergeGraceRemaining).toBe(0);
    expect(state.heroes).toHaveLength(1);
    expect(state.eggs[0].hp).toBe(3);
    breakEgg(engine);
    expect(state.hatchQueue[0].id).toBe('hatch-1');
  });

  it('preserves manual merge and move strategy; neither happens automatically', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    state.heroes.push({ id: 'compatible', kind: 'A', row: 3, col: 2, tier: 0, angle: 0 });
    breakEgg(engine);
    advance(engine, 26);
    expect(state.heroes).toHaveLength(3);
    expect(state.heroes.every((h) => h.tier === 0)).toBe(true);
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'compatible', targetId: 'hero-1' });
    expect(state.heroes.find((h) => h.id === 'hero-1')?.tier).toBe(1);
  });

  it('keeps countdown config independent from board/grace, without extra receive cooldown', () => {
    expect(GameBalance.HATCH.INCUBATION_SECONDS).toBe(2.5);
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    breakEgg(engine);
    advance(engine, 26);
    expect(state.hatchQueue).toHaveLength(0);
    expect(state.mergeGraceRemaining).toBe(0);
  });

  it('keeps inter-wave 4s countdown frozen on pause and resumed afterward', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    state.monsters[0].hp = 0;
    engine.tick(0.1);
    expect(state.interWaveCountdown).toBeGreaterThan(3.5);
    const remaining = state.interWaveCountdown;
    engine.dispatch({ type: 'PAUSE' });
    advance(engine, 10);
    expect(state.interWaveCountdown).toBe(remaining);
    engine.dispatch({ type: 'RESUME' });
    advance(engine, 45);
    expect(state.wave).toBe(2);
  });
});
