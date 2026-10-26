import { describe, expect, it } from 'vitest';
import { CampaignController } from '../src/game/campaign/CampaignController';
import {
  createDefaultProgress,
  type ProgressRepository
} from '../src/game/campaign/ProgressRepository';
import type { CampaignProgress } from '../src/game/config/levels';

class MemoryProgressRepository implements ProgressRepository {
  private value: CampaignProgress = createDefaultProgress();
  public saves = 0;

  async load(): Promise<CampaignProgress> {
    return structuredClone(this.value);
  }

  async save(progress: CampaignProgress): Promise<void> {
    this.value = structuredClone(progress);
    this.saves += 1;
  }

  async reset(): Promise<void> {
    this.value = createDefaultProgress();
  }
}

describe('Phase 9 — full campaign progression contract (#15)', () => {
  it('unlocks levels 1→10 in order, then preserves all results after reload', async () => {
    const repository = new MemoryProgressRepository();
    let campaign = new CampaignController(repository);
    await campaign.init();

    expect(campaign.getHighestUnlockedEggLevel()).toBe(1);
    expect(campaign.canPlayLevel(1)).toBe(true);
    expect(campaign.canPlayLevel(2)).toBe(false);

    for (let level = 1; level <= 10; level++) {
      expect(campaign.canPlayLevel(level)).toBe(true);
      if (level < 10) expect(campaign.canPlayLevel(level + 1)).toBe(false);

      const result = await campaign.recordLevelResult(level, 3, level * 2);
      expect(result.victory).toBe(true);
      expect(result.stars).toBe(3);
      expect(result.unlockedNext).toBe(level < 10);
      expect(result.highestUnlockedLevel).toBe(Math.min(10, level + 1));
      expect(campaign.getHighestUnlockedEggLevel()).toBe(
        level < 5 ? 1 : level < 10 ? 2 : 3
      );

      // Reload immediately after the first boss to catch persistence regressions.
      if (level === 5) {
        campaign = new CampaignController(repository);
        await campaign.init();
        expect(campaign.canPlayLevel(6)).toBe(true);
        expect(campaign.getHighestUnlockedEggLevel()).toBe(2);
      }
    }

    const reloaded = new CampaignController(repository);
    await reloaded.init();
    expect(reloaded.getProgress().highestUnlockedLevel).toBe(10);
    expect(reloaded.getHighestUnlockedEggLevel()).toBe(3);
    expect(reloaded.getTotalStars()).toBe(30);
    expect(reloaded.canPlayLevel(11)).toBe(false);
    for (let level = 1; level <= 10; level++) {
      expect(reloaded.canPlayLevel(level)).toBe(true);
      expect(reloaded.getProgress().results[level]).toEqual({
        bestStars: 3,
        bestKills: level * 2
      });
    }
  });

  it('does not accept wins for locked or out-of-range levels', async () => {
    const repository = new MemoryProgressRepository();
    const campaign = new CampaignController(repository);
    await campaign.init();

    for (const level of [0, 2, 5, 10, 11]) {
      const result = await campaign.recordLevelResult(level, 3, 99);
      expect(result).toEqual({
        victory: false,
        stars: 0,
        unlockedNext: false,
        highestUnlockedLevel: 1
      });
    }

    expect(repository.saves).toBe(0);
    expect(campaign.getProgress()).toEqual(createDefaultProgress());
    expect(campaign.getHighestUnlockedEggLevel()).toBe(1);
  });

  it('a failed Boss 5 attempt cannot unlock level 6 or tier 2', async () => {
    const repository = new MemoryProgressRepository();
    const campaign = new CampaignController(repository);
    await campaign.init();

    for (let level = 1; level < 5; level++) {
      await campaign.recordLevelResult(level, 3, level);
    }
    const defeat = await campaign.recordLevelResult(5, 0, 10);
    expect(defeat.victory).toBe(false);
    expect(defeat.unlockedNext).toBe(false);
    expect(campaign.canPlayLevel(6)).toBe(false);
    expect(campaign.getHighestUnlockedEggLevel()).toBe(1);
    expect(campaign.getProgress().results[5]).toBeUndefined();

    await campaign.recordLevelResult(5, 1, 12);
    expect(campaign.canPlayLevel(6)).toBe(true);
    expect(campaign.getHighestUnlockedEggLevel()).toBe(2);

    const reloaded = new CampaignController(repository);
    await reloaded.init();
    expect(reloaded.getHighestUnlockedEggLevel()).toBe(2);
    expect(reloaded.getProgress().results[5]?.bestStars).toBe(1);
  });

  it('replaying a cleared level never downgrades best stars or kills', async () => {
    const repository = new MemoryProgressRepository();
    const campaign = new CampaignController(repository);
    await campaign.init();

    await campaign.recordLevelResult(1, 3, 10);
    const replay = await campaign.recordLevelResult(1, 1, 2);
    expect(replay.victory).toBe(true);
    expect(replay.stars).toBe(1);
    expect(replay.unlockedNext).toBe(false);
    expect(campaign.getProgress().results[1]).toEqual({
      bestStars: 3,
      bestKills: 10
    });

    const reloaded = new CampaignController(repository);
    await reloaded.init();
    expect(reloaded.getProgress().results[1]).toEqual({
      bestStars: 3,
      bestKills: 10
    });
    expect(reloaded.canPlayLevel(2)).toBe(true);
  });
});
