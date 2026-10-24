import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignController } from '../src/game/campaign/CampaignController';
import { GameEngine } from '../src/game/domain/GameEngine';
import { getLevelConfig, LEVELS } from '../src/game/config/levels';
import { type ProgressRepository, createDefaultProgress } from '../src/game/campaign/ProgressRepository';
import type { CampaignProgress } from '../src/game/config/levels';

class MockProgressRepository implements ProgressRepository {
  private progress: CampaignProgress = createDefaultProgress();

  public async load(): Promise<CampaignProgress> {
    return JSON.parse(JSON.stringify(this.progress));
  }

  public async save(p: CampaignProgress): Promise<void> {
    this.progress = JSON.parse(JSON.stringify(p));
  }

  public async reset(): Promise<void> {
    this.progress = createDefaultProgress();
  }
}

describe('Phase 6 - Campaign & Level System', () => {
  let mockRepo: MockProgressRepository;
  let campaign: CampaignController;

  beforeEach(async () => {
    mockRepo = new MockProgressRepository();
    campaign = new CampaignController(mockRepo);
    await campaign.init();
  });

  it('C01 & C02: Lần đầu chơi chỉ mở Level 1, các Level 2-10 bị khóa ở logic', () => {
    expect(campaign.canPlayLevel(1)).toBe(true);
    for (let lvl = 2; lvl <= 10; lvl++) {
      expect(campaign.canPlayLevel(lvl)).toBe(false);
    }
    // Out of bounds levels
    expect(campaign.canPlayLevel(0)).toBe(false);
    expect(campaign.canPlayLevel(11)).toBe(false);
  });

  it('C03: Start Level 1 có 3 wave, Base HP 3, 1 hero ATK 1, Egg HP 3', () => {
    const l1Config = getLevelConfig(1);
    expect(l1Config.waves.length).toBe(3);
    expect(l1Config.baseHP).toBe(3);

    const engine = new GameEngine(undefined, undefined, l1Config);
    const s = engine.getState();
    expect(s.currentLevelId).toBe(1);
    expect(s.totalWaves).toBe(3);
    expect(s.baseHp).toBe(3);
    expect(s.heroes.length).toBe(1);
    expect(s.heroes[0].tier).toBe(0); // ATK 1
    expect(s.egg.hp).toBe(3);
  });

  it('C04: Level 5 có 5 wave và có metadata isBossLevel', () => {
    const l5Config = getLevelConfig(5);
    expect(l5Config.waves.length).toBe(5);
    expect(l5Config.isBossLevel).toBe(true);
    // Wave 5 has boss
    const lastWave = l5Config.waves[4];
    expect(lastWave.enemies.some((e) => e.type === 'boss')).toBe(true);
  });

  it('C05: Win Level 1 còn 3 HP: 3 sao, mở Level 2', async () => {
    const result = await campaign.recordLevelResult(1, 3, 5);
    expect(result.victory).toBe(true);
    expect(result.stars).toBe(3);
    expect(result.unlockedNext).toBe(true);
    expect(result.highestUnlockedLevel).toBe(2);

    expect(campaign.canPlayLevel(2)).toBe(true);
    expect(campaign.canPlayLevel(3)).toBe(false);

    const progress = campaign.getProgress();
    expect(progress.results[1]?.bestStars).toBe(3);
    expect(progress.results[1]?.bestKills).toBe(5);
  });

  it('C06: Win Level 1 còn 1 HP: 1 sao, mở Level 2', async () => {
    const result = await campaign.recordLevelResult(1, 1, 3);
    expect(result.victory).toBe(true);
    expect(result.stars).toBe(1);
    expect(result.unlockedNext).toBe(true);
    expect(result.highestUnlockedLevel).toBe(2);
  });

  it('C07: Replay kết quả thấp không ghi đè kết quả tốt hơn', async () => {
    // First run: 3 stars
    await campaign.recordLevelResult(1, 3, 5);
    expect(campaign.getProgress().results[1]?.bestStars).toBe(3);

    // Replay run: 1 star
    const replayResult = await campaign.recordLevelResult(1, 1, 2);
    expect(replayResult.stars).toBe(1); // earned 1 star in this replay
    // But saved bestStars remains 3!
    expect(campaign.getProgress().results[1]?.bestStars).toBe(3);
    expect(campaign.getProgress().results[1]?.bestKills).toBe(5);
  });

  it('C08: Defeat Level 2 không mở Level 3 và không cấp sao', async () => {
    // Unlock level 2
    await campaign.recordLevelResult(1, 3, 5);
    expect(campaign.canPlayLevel(2)).toBe(true);

    // Defeat on level 2 (Base HP = 0)
    const defeatResult = await campaign.recordLevelResult(2, 0, 4);
    expect(defeatResult.victory).toBe(false);
    expect(defeatResult.stars).toBe(0);
    expect(defeatResult.unlockedNext).toBe(false);

    // Level 3 remains locked
    expect(campaign.canPlayLevel(3)).toBe(false);
    expect(campaign.getProgress().highestUnlockedLevel).toBe(2);
  });

  it('C09: Restart trong Level N khởi động lại đúng Level N với trạng thái mới', () => {
    const l3Config = getLevelConfig(3);
    const engine = new GameEngine(undefined, undefined, l3Config);

    // Advance combat, simulate changes
    engine.getState().heroes.push({
      id: 'h-temp',
      kind: 'B',
      row: 1,
      col: 1,
      tier: 1,
      angle: 0
    });
    engine.getState().baseHp = 1;
    engine.getState().kills = 8;
    engine.getState().wave = 2;

    // Restart level
    engine.restartLevel();

    const s = engine.getState();
    expect(s.currentLevelId).toBe(3);
    expect(s.totalWaves).toBe(4);
    expect(s.wave).toBe(1);
    expect(s.baseHp).toBe(3);
    expect(s.kills).toBe(0);
    expect(s.heroes.length).toBe(1);
    expect(s.egg.hp).toBe(3);
    expect(s.isGameOver).toBe(false);
    expect(s.isVictory).toBe(false);
  });

  it('C10: Chuyển Level 1 sang Level 2 không mang theo hero/ATK, egg HP, kills cũ', () => {
    const engine = new GameEngine(undefined, undefined, getLevelConfig(1));

    // Power up in Level 1
    engine.getState().heroes[0].tier = 3; // ATK 8
    engine.getState().egg.hp = 9;
    engine.getState().kills = 15;

    // Transition to Level 2
    const l2Config = getLevelConfig(2);
    engine.startLevel(l2Config);

    const s = engine.getState();
    expect(s.currentLevelId).toBe(2);
    expect(s.heroes.length).toBe(1);
    expect(s.heroes[0].tier).toBe(0); // Clean initial ATK 1
    expect(s.egg.hp).toBe(3); // Clean initial Egg HP 3
    expect(s.kills).toBe(0); // Clean kills
    expect(s.baseHp).toBe(3); // Clean base HP
  });

  it('Storage Persistence: Tiến trình lưu trữ được nạp đầy đủ sau khi khởi động lại controller', async () => {
    // Win level 1 (3 stars) -> unlock level 2
    await campaign.recordLevelResult(1, 3, 5);
    // Win level 2 (2 stars) -> unlock level 3
    await campaign.recordLevelResult(2, 2, 8);

    // Create fresh controller with same repository (simulates reload)
    const newController = new CampaignController(mockRepo);
    await newController.init();

    expect(newController.canPlayLevel(1)).toBe(true);
    expect(newController.canPlayLevel(2)).toBe(true);
    expect(newController.canPlayLevel(3)).toBe(true);
    expect(newController.canPlayLevel(4)).toBe(false);
    expect(newController.getProgress().results[1]?.bestStars).toBe(3);
    expect(newController.getProgress().results[2]?.bestStars).toBe(2);
    expect(newController.getTotalStars()).toBe(5);
  });

  it('All 10 levels have valid configurations', () => {
    expect(LEVELS.length).toBe(10);
    for (let i = 1; i <= 10; i++) {
      const cfg = getLevelConfig(i);
      expect(cfg.id).toBe(i);
      expect(cfg.waves.length).toBeGreaterThanOrEqual(3);
      for (const wave of cfg.waves) {
        expect(wave.enemies.length).toBeGreaterThan(0);
        for (const enemy of wave.enemies) {
          expect(enemy.hp).toBeGreaterThan(0);
          expect(enemy.speed).toBeGreaterThan(0);
          expect(enemy.escapeDamage).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

