import { describe, expect, it } from 'vitest';
import { createDefaultProgress, sanitizeCampaignProgress } from '../src/game/campaign/ProgressRepository';

describe('Campaign save validation (Issue #15)', () => {
  it('returns defaults for invalid or unsupported saves', () => {
    for (const value of [null, undefined, [], 'bad', { schemaVersion: 99 }, { schemaVersion: 1, results: [] }]) {
      const progress = sanitizeCampaignProgress(value);
      expect(progress).toEqual(createDefaultProgress());
    }
  });

  it('preserves recorded stars and egg tier when reloading after Boss 5', () => {
    const record = {
      schemaVersion: 1, highestUnlockedLevel: 8, highestUnlockedEggLevel: 2,
      results: { 1: { bestStars: 3, bestKills: 5 }, 5: { bestStars: 2, bestKills: 18 } }
    };
    const loaded = sanitizeCampaignProgress(record);
    expect(loaded.highestUnlockedLevel).toBe(8);
    expect(loaded.highestUnlockedEggLevel).toBe(2);
    expect(loaded.results[5]).toEqual({ bestStars: 2, bestKills: 18 });
  });

  it('migrates older schema-v1 save without explicit egg tier', () => {
    const loaded = sanitizeCampaignProgress({
      schemaVersion: 1, highestUnlockedLevel: 10,
      results: { 5: { bestStars: 1, bestKills: 14 }, 10: { bestStars: 2, bestKills: 23 } }
    });
    expect(loaded.highestUnlockedEggLevel).toBe(3);
  });

  it('clamps malformed stars, kills, unlocks and invalid result keys', () => {
    const loaded = sanitizeCampaignProgress({
      schemaVersion: 1, highestUnlockedLevel: Number.POSITIVE_INFINITY, highestUnlockedEggLevel: 99,
      results: {
        '01': { bestStars: 2, bestKills: 2 },
        2: { bestStars: 99, bestKills: -4 },
        5: { bestStars: 'invalid', bestKills: 12.8 },
        11: { bestStars: 3, bestKills: 55 },
        9: null
      }
    });
    expect(loaded.highestUnlockedLevel).toBe(1);
    expect(loaded.highestUnlockedEggLevel).toBe(3);
    expect(loaded.results).toEqual({
      2: { bestStars: 3, bestKills: 0 },
      5: { bestStars: 0, bestKills: 12 }
    });
  });

  it('does not create stars from missing/non-finite data', () => {
    const loaded = sanitizeCampaignProgress({
      schemaVersion: 1, highestUnlockedLevel: 'nope', highestUnlockedEggLevel: NaN,
      results: { 4: { bestStars: Infinity, bestKills: -Infinity }, 8: { bestStars: 0, bestKills: 0 } }
    });
    expect(loaded.highestUnlockedLevel).toBe(1);
    expect(loaded.highestUnlockedEggLevel).toBe(1);
    expect(loaded.results).toEqual({});
  });
});
