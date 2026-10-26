import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { getLevelConfig } from '../src/game/config/levels';
import type { RandomSource } from '../src/game/domain/RandomSource';

const mockRandom: RandomSource = {
  next: () => 0.25, // selects Kind A, tier 0
  choose: <T>(arr: T[]) => arr[0]
};

describe('Issue #25 - Hero Pacing, Hatch Queue & Manual Claim', () => {
  it('adds egg reward to hatchQueue on HP=0 without auto-spawning when autoReceive is false', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    const hero = state.heroes[0];
    const egg = state.eggs[0];

    expect(state.autoReceiveHatch).toBe(false);
    expect(state.hatchQueue).toHaveLength(0);

    // Attack egg until HP = 0 (egg HP is 3)
    egg.hp = 1;
    engine.applyEggDamage(hero, egg.id, 'drag');

    expect(egg.hp).toBe(0);
    expect(egg.status).toBe('pending');
    expect(egg.readyToHatch).toBe(true);
    expect(egg.pendingHero).not.toBeNull();
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.hatchQueue[0].eggId).toBe(egg.id);
    expect(state.hatchQueue[0].reward).toEqual(egg.pendingHero);

    // Hero count must NOT increase immediately
    expect(state.heroes).toHaveLength(1);
    // Hatch count of egg must NOT increment until claimed
    expect(egg.hatchCount).toBe(0);
  });

  it('allows manual claim via CLAIM_HERO, increments hatchCount and sets 2.5s cooldown', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    const hero = state.heroes[0];
    const egg = state.eggs[0];

    egg.hp = 1;
    engine.applyEggDamage(hero, egg.id, 'drag');
    expect(state.hatchQueue).toHaveLength(1);

    // Dispatch CLAIM_HERO
    engine.dispatch({ type: 'CLAIM_HERO' });

    expect(state.heroes).toHaveLength(2);
    expect(state.hatchQueue).toHaveLength(0);
    expect(egg.status).toBe('active');
    expect(egg.pendingHero).toBeNull();
    expect(egg.readyToHatch).toBe(false);
    expect(egg.hatchCount).toBe(1);
    expect(egg.hp).toBe(5); // 3 + 2*1 = 5
    expect(state.hatchCooldownRemaining).toBeCloseTo(GameBalance.HATCH.MIN_INTERVAL, 1);
  });

  it('disables CLAIM_HERO while on cooldown, when board is full, or when paused', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    const state = engine.getState();
    const hero = state.heroes[0];

    // Break egg 0 and egg 1
    state.eggs[0].hp = 1;
    engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    for (let t = 0; t < 4; t++) engine.tick(0.1);
    state.eggs[1].hp = 1;
    engine.applyEggDamage(hero, state.eggs[1].id, 'drag');

    expect(state.hatchQueue).toHaveLength(2);

    // First claim succeeds
    const claim1 = engine.claimHatchReward();
    expect(claim1).toBe(true);
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.hatchCooldownRemaining).toBeGreaterThan(0);

    // Immediate second claim MUST fail due to cooldown
    const claim2 = engine.claimHatchReward();
    expect(claim2).toBe(false);
    expect(state.hatchQueue).toHaveLength(1);

    // Advance 2.0s: still in cooldown (2.5s total)
    for (let t = 0; t < 20; t++) engine.tick(0.1);
    expect(engine.claimHatchReward()).toBe(false);

    // Advance 0.6s more: cooldown expired
    for (let t = 0; t < 6; t++) engine.tick(0.1);
    expect(state.hatchCooldownRemaining).toBe(0);

    // Second claim now succeeds
    const claim3 = engine.claimHatchReward();
    expect(claim3).toBe(true);
    expect(state.hatchQueue).toHaveLength(0);

    // Pause test: cannot claim while paused
    state.isPaused = true;
    expect(engine.claimHatchReward()).toBe(false);
  });

  it('preserves all items in FIFO queue when >3 eggs break (e.g. Level 6 with 4 eggs)', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6));
    const state = engine.getState();
    expect(state.eggs).toHaveLength(4);

    const hero = state.heroes[0];

    // Break all 4 eggs
    for (let i = 0; i < 4; i++) {
      state.eggs[i].hp = 1;
      engine.applyEggDamage(hero, state.eggs[i].id, 'drag');
      for (let t = 0; t < 4; t++) engine.tick(0.1);
    }

    expect(state.hatchQueue).toHaveLength(4);
    expect(state.hatchQueue.map((q) => q.eggId)).toEqual(['egg-1', 'egg-2', 'egg-3', 'egg-4']);

    // Check each egg has its own pendingHero and status
    for (let i = 0; i < 4; i++) {
      expect(state.eggs[i].status).toBe('pending');
      expect(state.eggs[i].pendingHero).not.toBeNull();
      expect(state.eggs[i].hp).toBe(0);
    }

    // Claim them one by one
    for (let i = 0; i < 4; i++) {
      // Cooldown wait if not first
      if (state.hatchCooldownRemaining > 0) {
        for (let t = 0; t < 26; t++) engine.tick(0.1);
      }
      const claimed = engine.claimHatchReward();
      expect(claimed).toBe(true);
      expect(state.eggs[i].status).toBe('active');
      expect(state.eggs[i].hatchCount).toBe(1);
    }

    expect(state.hatchQueue).toHaveLength(0);
    expect(state.heroes).toHaveLength(5); // 1 initial + 4 hatched
  });

  it('paces auto-receive with at least 2.5s interval and never spawns multiple heroes in one tick', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    engine.toggleAutoReceive(true);
    const state = engine.getState();
    expect(state.autoReceiveHatch).toBe(true);

    const hero = state.heroes[0];

    // Break both eggs
    state.eggs[0].hp = 1;
    engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    for (let t = 0; t < 4; t++) engine.tick(0.1);
    state.eggs[1].hp = 1;
    engine.applyEggDamage(hero, state.eggs[1].id, 'drag');

    // In autoReceive mode: egg 0 should have hatched, egg 1 is in queue
    expect(state.heroes.length).toBe(2);
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.hatchCooldownRemaining).toBeGreaterThan(0);

    // Tick for 2.0s: cooldown remaining > 0, egg 1 must NOT hatch
    for (let t = 0; t < 20; t++) engine.tick(0.1);
    expect(state.heroes.length).toBe(2);
    expect(state.hatchQueue).toHaveLength(1);

    // Tick for 0.6s more (total 2.6s >= 2.5s): egg 1 hatches automatically
    for (let t = 0; t < 6; t++) engine.tick(0.1);
    expect(state.heroes.length).toBe(3);
    expect(state.hatchQueue).toHaveLength(0);
  });

  it('preserves queue indefinitely when board is full (25 heroes) without dropping rewards', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    const state = engine.getState();

    // Fill board with 25 heroes
    state.heroes = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        state.heroes.push({
          id: `hero-${r}-${c}`,
          kind: 'A',
          row: r,
          col: c,
          tier: 0,
          angle: 0
        });
      }
    }
    expect(state.heroes).toHaveLength(25);

    // Break 2 eggs
    state.eggs[0].hp = 1;
    engine.applyEggDamage(state.heroes[0], state.eggs[0].id, 'drag');
    for (let t = 0; t < 4; t++) engine.tick(0.1);
    state.eggs[1].hp = 1;
    engine.applyEggDamage(state.heroes[0], state.eggs[1].id, 'drag');

    expect(state.hatchQueue).toHaveLength(2);

    // Try manual claim on full board: fails
    expect(engine.claimHatchReward()).toBe(false);

    // Advance 10s: rewards must still be in queue
    for (let t = 0; t < 100; t++) engine.tick(0.1);
    expect(state.hatchQueue).toHaveLength(2);
    expect(state.heroes).toHaveLength(25);

    // Merge 2 heroes to free a cell
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'hero-0-0', targetId: 'hero-0-1' });
    expect(state.heroes).toHaveLength(24);

    // Now claim succeeds for the first reward
    expect(engine.claimHatchReward()).toBe(true);
    expect(state.heroes).toHaveLength(25);
    expect(state.hatchQueue).toHaveLength(1);
  });

  it('handles inter-wave 4.0s countdown with pause/resume support', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();

    // Kill wave 1 monster to trigger inter-wave delay
    state.monsters[0].hp = 0;
    engine.tick(0.1);
    expect(state.monsters).toHaveLength(0);
    expect(state.wave).toBe(1);

    // Inter-wave countdown should be active and around 3.9s
    expect(state.interWaveCountdown).toBeDefined();
    expect(state.interWaveCountdown).toBeLessThanOrEqual(4.0);
    expect(state.interWaveCountdown).toBeGreaterThan(3.5);

    const savedCountdown = state.interWaveCountdown!;

    // Pause simulation
    engine.dispatch({ type: 'PAUSE' });
    engine.tick(1.0);
    expect(state.interWaveCountdown).toBe(savedCountdown);

    // Resume simulation
    engine.dispatch({ type: 'RESUME' });
    engine.tick(1.0);
    expect(state.interWaveCountdown!).toBeLessThan(savedCountdown);

    // Advance past remaining time -> wave 2 starts
    for (let t = 0; t < 45; t++) engine.tick(0.1);
    expect(state.wave).toBe(2);
    expect(state.interWaveCountdown).toBeUndefined();
  });
});
