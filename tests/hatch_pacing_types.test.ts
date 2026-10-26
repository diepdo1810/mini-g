import { describe, it, expect } from 'vitest';
import { GameBalance } from '../src/game/config/GameBalance';
import { createInitialState } from '../src/game/domain/GameState';
import type { QueuedHatchReward } from '../src/game/domain/types';

describe('Issue #25 - Domain Types and Configuration', () => {
  it('has correct hatch pacing and inter-wave delay configurations in GameBalance', () => {
    expect(GameBalance.HATCH.MIN_INTERVAL).toBe(2.5);
    expect(GameBalance.HATCH.DEFAULT_AUTO_RECEIVE).toBe(false);
    expect(GameBalance.HATCH.MAX_VISIBLE_QUEUE).toBe(3);
    expect(GameBalance.WAVES.INTER_WAVE_DELAY).toBe(4.0);
  });

  it('initializes GameState with empty hatchQueue, autoReceiveHatch false, and 0 cooldown', () => {
    const state = createInitialState(1, 3, 1);
    expect(state.hatchQueue).toEqual([]);
    expect(state.autoReceiveHatch).toBe(false);
    expect(state.hatchCooldownRemaining).toBe(0);
    expect(state.selectedHeroId).toBeUndefined();
  });

  it('supports QueuedHatchReward structure', () => {
    const item: QueuedHatchReward = {
      eggId: 'egg-1',
      slotIndex: 0,
      reward: { kind: 'A', heroTier: 0 }
    };
    expect(item.eggId).toBe('egg-1');
    expect(item.slotIndex).toBe(0);
    expect(item.reward.kind).toBe('A');
  });
});
