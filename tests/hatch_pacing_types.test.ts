import { describe, it, expect } from 'vitest';
import { GameBalance } from '../src/game/config/GameBalance';
import { createInitialState } from '../src/game/domain/GameState';
import type { QueuedHatchReward } from '../src/game/domain/types';

describe('Issue #25 - Auto Hatch domain contract', () => {
  it('uses single FIFO incubation, one board reserve cell and 4s between waves', () => {
    expect(GameBalance.HATCH.INCUBATION_SECONDS).toBe(2.5);
    expect(GameBalance.HATCH.RESERVED_EMPTY_CELLS).toBe(1);
    expect(GameBalance.HATCH.MERGE_GRACE_SECONDS).toBe(0.6);
    expect(GameBalance.HATCH.MAX_VISIBLE_QUEUE).toBe(3);
    expect(GameBalance.WAVES.INTER_WAVE_DELAY).toBe(4.0);
  });

  it('initializes an empty queue and no merge grace', () => {
    const state = createInitialState(1, 3, 1);
    expect(state.hatchQueue).toEqual([]);
    expect(state.mergeGraceRemaining).toBe(0);
    expect(state.selectedHeroId).toBeUndefined();
  });

  it('uses independently identified, timed reward snapshots', () => {
    const item: QueuedHatchReward = {
      id: 'hatch-1', eggId: 'egg-1', slotIndex: 0,
      reward: { kind: 'A', heroTier: 0 }, remainingSeconds: 2.5
    };
    expect(item.id).toBe('hatch-1');
    expect(item.reward.kind).toBe('A');
    expect(item.remainingSeconds).toBe(2.5);
  });
});
