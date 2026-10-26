import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { getLevelConfig } from '../src/game/config/levels';
import {
  eggCountForLevel,
  allowedEggLevelForLevel,
  resolveEggLevel,
  calculateEggPositions,
  rollHatch
} from '../src/game/domain/EggProgression';
import { CampaignController } from '../src/game/campaign/CampaignController';
import type { ProgressRepository } from '../src/game/campaign/ProgressRepository';
import type { CampaignProgress } from '../src/game/config/levels';
import type { RandomSource } from '../src/game/domain/RandomSource';

class MockRandom implements RandomSource {
  private values: number[] = [];
  private index = 0;

  constructor(values: number[] = []) {
    this.values = values;
  }

  public setValues(values: number[]): void {
    this.values = values;
    this.index = 0;
  }

  public next(): number {
    if (this.index < this.values.length) {
      return this.values[this.index++];
    }
    return 0.5;
  }

  public choose<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot choose from empty array');
    const idx = Math.floor(this.next() * items.length);
    return items[Math.min(idx, items.length - 1)];
  }
}

class InMemoryRepo implements ProgressRepository {
  public progress: CampaignProgress = {
    schemaVersion: 1,
    highestUnlockedLevel: 1,
    highestUnlockedEggLevel: 1,
    results: {}
  };

  public async load(): Promise<CampaignProgress> {
    return JSON.parse(JSON.stringify(this.progress));
  }

  public async save(p: CampaignProgress): Promise<void> {
    this.progress = JSON.parse(JSON.stringify(p));
  }

  public async reset(): Promise<void> {
    this.progress = {
      schemaVersion: 1,
      highestUnlockedLevel: 1,
      highestUnlockedEggLevel: 1,
      results: {}
    };
  }
}

describe('MD-FIX-EGG-01: Multi-Egg & Boss Evolution Acceptance Tests', () => {
  let mockRandom: MockRandom;

  beforeEach(() => {
    mockRandom = new MockRandom();
  });

  // E01: eggCountForLevel
  it('E01: eggCountForLevel(1, 2, 3, 4, 5, 6, 10, 11, 99) -> 1,2,2,3,3,4,4,5,5', () => {
    const input = [1, 2, 3, 4, 5, 6, 10, 11, 99];
    const expected = [1, 2, 2, 3, 3, 4, 4, 5, 5];
    const result = input.map(eggCountForLevel);
    expect(result).toEqual(expected);
  });

  // E02: Level 1 khởi tạo
  it('E02: Level 1 khởi tạo có 1 active egg, 1 hero A ATK 1, HP trứng 3', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();

    expect(state.eggs.length).toBe(1);
    expect(state.eggs[0].id).toBe('egg-1');
    expect(state.eggs[0].eggLevel).toBe(1);
    expect(state.eggs[0].status).toBe('active');
    expect(state.eggs[0].hp).toBe(3);
    expect(state.eggs[0].maxHp).toBe(3);
    expect(state.heroes.length).toBe(1);
    expect(state.heroes[0].kind).toBe('A');
    expect(state.heroes[0].tier).toBe(0);
  });

  // E03: Level 6, unlock Boss 5
  it('E03: Level 6 với Boss 5 unlocked -> 4 trứng cấp 2, HP ban đầu mỗi trứng 5', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();

    expect(state.eggs.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(state.eggs[i].eggLevel).toBe(2);
      expect(state.eggs[i].hp).toBe(5);
      expect(state.eggs[i].maxHp).toBe(5);
      expect(state.eggs[i].status).toBe('active');
    }
  });

  // E04: Level 10, unlock Boss 5
  it('E04: Level 10 với Boss 5 unlocked -> 4 trứng cấp 2, không mở level 11 trên map', async () => {
    const repo = new InMemoryRepo();
    repo.progress.highestUnlockedLevel = 10;
    repo.progress.highestUnlockedEggLevel = 2;
    const campaign = new CampaignController(repo);
    await campaign.init();

    expect(campaign.canPlayLevel(10)).toBe(true);
    expect(campaign.canPlayLevel(11)).toBe(false);

    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(10), 2);
    const state = engine.getState();
    expect(state.eggs.length).toBe(4);
    expect(state.eggs[0].eggLevel).toBe(2);
  });

  // E05: Hoàn thành Boss 5 giữa trận
  it('E05: Hoàn thành Boss 5 không đổi trứng trận đang chạy, chỉ mở cấp 2 cho các trận tiếp theo', async () => {
    const repo = new InMemoryRepo();
    // Boss 5 must be unlocked before a legitimate victory can be recorded.
    repo.progress.highestUnlockedLevel = 5;
    const campaign = new CampaignController(repo);
    await campaign.init();

    // Start Level 5 with egg level 1
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(5), 1);
    const state = engine.getState();
    expect(state.eggs.length).toBe(3);
    expect(state.eggs[0].eggLevel).toBe(1);

    // Mid-match victory on Boss 5 recorded in campaign
    await campaign.recordLevelResult(5, 3, 10);
    expect(campaign.getHighestUnlockedEggLevel()).toBe(2);

    // Current running match keeps 3 eggs of level 1!
    expect(engine.getState().eggs.length).toBe(3);
    expect(engine.getState().eggs[0].eggLevel).toBe(1);

    // Subsequent Level 6 match uses newly unlocked egg level 2
    const nextEngine = new GameEngine(
      undefined,
      mockRandom,
      getLevelConfig(6),
      campaign.getHighestUnlockedEggLevel()
    );
    expect(nextEngine.getState().eggs.length).toBe(4);
    expect(nextEngine.getState().eggs[0].eggLevel).toBe(2);
  });

  // E06: Hoàn thành Boss 10
  it('E06: Hoàn thành Boss 10 ghi nhận mốc cấp 3, không tự mở Level 11', async () => {
    const repo = new InMemoryRepo();
    repo.progress.highestUnlockedLevel = 10;
    repo.progress.highestUnlockedEggLevel = 2;
    const campaign = new CampaignController(repo);
    await campaign.init();

    await campaign.recordLevelResult(10, 3, 20);

    expect(campaign.getHighestUnlockedEggLevel()).toBe(3);
    expect(campaign.canPlayLevel(11)).toBe(false);
  });

  // E07: Replay Level 2 sau Boss 10
  it('E07: Replay Level 2 sau Boss 10 bị giới hạn 2 trứng cấp 1 để giữ cân bằng', () => {
    expect(allowedEggLevelForLevel(2)).toBe(1);
    expect(resolveEggLevel(2, 3)).toBe(1);

    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2), 3);
    const state = engine.getState();
    expect(state.eggs.length).toBe(2);
    expect(state.eggs[0].eggLevel).toBe(1);
    expect(state.eggs[1].eggLevel).toBe(1);
    expect(state.eggs[0].hp).toBe(3);
  });

  // E08: Nở 1 trong 4 trứng
  it('E08: Nở 1 trong 4 trứng chỉ tăng hatchCount và reset HP của chính trứng đó', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();
    const hero = state.heroes[0];

    // Attack egg #2 (index 1) until HP 0 (5 HP)
    for (let i = 0; i < 5; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id, eggId: state.eggs[1].id });
    }
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.eggs[1].status).toBe('active');
    expect(state.heroes).toHaveLength(1);

    expect(state.eggs[1].hatchCount).toBe(1);
    // Base 5 + 2 * 1 = 7 HP
    expect(state.eggs[1].hp).toBe(7);
    expect(state.eggs[1].maxHp).toBe(7);

    // Other eggs remain untouched: hatchCount 0, HP 5
    expect(state.eggs[0].hatchCount).toBe(0);
    expect(state.eggs[0].hp).toBe(5);
    expect(state.eggs[2].hatchCount).toBe(0);
    expect(state.eggs[2].hp).toBe(5);
    expect(state.eggs[3].hatchCount).toBe(0);
    expect(state.eggs[3].hp).toBe(5);
  });

  // E09: Sword hit monster, không giao egg
  it('E09: Kiếm chém trúng quái nhưng không chạm trứng -> chỉ quái mất HP, 4 trứng giữ nguyên', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();

    // Place hero at (0, 2) on top row
    state.heroes = [{ id: 'hero-top', kind: 'A', row: 0, col: 2, tier: 0, angle: -Math.PI / 2 }];
    state.monsters = [{ id: 'monster-top', hp: 3, maxHp: 3, progress: 160, speed: 0 }];

    const initialEggHps = state.eggs.map((e) => e.hp);

    engine.tick(0.001);

    expect(state.monsters[0].hp).toBe(2);
    expect(state.eggs.map((e) => e.hp)).toEqual(initialEggHps);
  });

  // E10: Sword hit 2 egg hitboxes thật
  it('E10: Kiếm quét qua 2 trứng -> cả 2 trứng mất HP theo cooldown độc lập', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();

    // Place hero between egg 1 and egg 2
    const egg1 = state.eggs[0];
    const egg2 = state.eggs[1];
    const midX = (egg1.x + egg2.x) / 2;
    const heroY = egg1.y - 45; // 45px above eggs

    state.heroes = [{ id: 'hero-multi', kind: 'A', row: 4, col: 1, tier: 0, angle: Math.PI / 2 }];
    // Override getHeroCenter for this test to exactly target the 2 eggs
    engine.getHeroCenter = () => ({ x: midX, y: heroY });

    const initialHp1 = egg1.hp;
    const initialHp2 = egg2.hp;

    // Angle pointing down-left towards egg1
    state.heroes[0].angle = Math.PI * 0.7;
    engine.tick(0.001);
    expect(egg1.hp).toBe(initialHp1 - 1);
    expect(egg2.hp).toBe(initialHp2);

    // Rotate sword towards egg2
    state.heroes[0].angle = Math.PI * 0.3;
    engine.tick(0.001);
    expect(egg2.hp).toBe(initialHp2 - 1);
  });

  // E11: Drag tới trứng thứ 4
  it('E11: Drag tới trứng #4 làm trứng #4 nhận 1 hit, hero giữ nguyên ô, các trứng khác giữ nguyên', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();
    const hero = state.heroes[0];
    const initialRow = hero.row;
    const initialCol = hero.col;

    const egg4 = state.eggs[3];
    const initialHp4 = egg4.hp;

    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id, eggId: egg4.id });

    expect(egg4.hp).toBe(initialHp4 - 1);
    expect(hero.row).toBe(initialRow);
    expect(hero.col).toBe(initialCol);

    expect(state.eggs[0].hp).toBe(5);
    expect(state.eggs[1].hp).toBe(5);
    expect(state.eggs[2].hp).toBe(5);
  });

  // E12: Orbit + drag cùng tick, cùng hero và egg
  it('E12: Orbit và drag cùng hero và cùng egg trong 1 tick chỉ tính 1 hit duy nhất', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    const hero = state.heroes[0];
    const egg = state.eggs[0];

    const initialHp = egg.hp;

    const hit1 = engine.applyEggDamage(hero, egg.id, 'orbit');
    const hit2 = engine.applyEggDamage(hero, egg.id, 'drag');

    expect(hit1).toBe(true);
    expect(hit2).toBe(false); // suppressed same tick!
    expect(egg.hp).toBe(initialHp - 1);
  });

  // E13: simultaneous egg breaks create distinct queued rewards
  it('E13: 2 trứng cùng vỡ -> 2 phần thưởng ấp tuần tự, không mất/trùng Hero', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    const state = engine.getState();
    const hero = state.heroes[0];
    state.eggs[0].hp = 1;
    state.eggs[1].hp = 1;

    engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    engine.applyEggDamage(hero, state.eggs[1].id, 'drag');
    expect(state.hatchQueue).toHaveLength(2);
    expect(new Set(state.hatchQueue.map((q) => q.id)).size).toBe(2);
    expect(state.eggs.map((e) => e.status)).toEqual(['active', 'active']);
    expect(state.eggs.map((e) => e.hp)).toEqual([5, 5]);

    for (let t = 0; t < 26; t++) engine.tick(0.1);
    expect(state.heroes).toHaveLength(2);
    for (let t = 0; t < 26; t++) engine.tick(0.1);
    expect(state.heroes).toHaveLength(3);
    expect(state.hatchQueue).toHaveLength(0);
    expect(new Set(state.heroes.map((h) => h.id)).size).toBe(3);
  });

  // E14: full board retains ready rewards; one empty cell is reserved.
  it('E14: Bàn 25 ô đầy: giữ queue, cần 2 lần ghép để dành 1 ô trống', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(2));
    const state = engine.getState();
    // Isolate board-capacity behavior from automatic sword collisions with eggs.
    engine.getHeroCenter = () => ({ x: 225, y: 300 });
    state.heroes = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        state.heroes.push({ id: `hero-${row}-${col}`, kind: 'A', row, col, tier: 0, angle: 0 });
      }
    }
    state.eggs[0].hp = 1;
    state.eggs[1].hp = 1;
    engine.applyEggDamage(state.heroes[0], state.eggs[0].id, 'drag');
    engine.applyEggDamage(state.heroes[0], state.eggs[1].id, 'drag');
    for (let t = 0; t < 30; t++) engine.tick(0.1);

    expect(state.heroes).toHaveLength(25);
    expect(state.hatchQueue).toHaveLength(2);
    expect(state.hatchQueue[0].remainingSeconds).toBe(0);

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'hero-0-0', targetId: 'hero-0-1' });
    for (let t = 0; t < 10; t++) engine.tick(0.1);
    expect(state.heroes).toHaveLength(24);
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'hero-1-0', targetId: 'hero-1-1' });
    for (let t = 0; t < 7; t++) engine.tick(0.1);

    expect(state.heroes).toHaveLength(24);
    expect(state.hatchQueue).toHaveLength(1);
    expect(state.eggs.map((egg) => egg.status)).toEqual(['active', 'active']);
  });

  // E15: Roll cấp 1/2/3 với mock RNG
  it('E15: Roll cấp 1/2/3 với mock RNG biên 0, .49, .5, .79, .8, .99 ra hero tier đúng bảng', () => {
    const rng = new MockRandom();

    // Level 1: 100% tier 0
    rng.setValues([0.1]); // kind
    expect(rollHatch(1, rng).heroTier).toBe(0);
    rng.setValues([0.9]); // kind
    expect(rollHatch(1, rng).heroTier).toBe(0);

    // Level 2: 50% tier 0, 50% tier 1
    // roll < 50 -> tier 0, roll >= 50 -> tier 1
    rng.setValues([0.2, 0.49]); // kind, roll=49
    expect(rollHatch(2, rng).heroTier).toBe(0);

    rng.setValues([0.2, 0.5]); // kind, roll=50
    expect(rollHatch(2, rng).heroTier).toBe(1);

    rng.setValues([0.2, 0.99]); // kind, roll=99
    expect(rollHatch(2, rng).heroTier).toBe(1);

    // Level 3: 20% tier 0, 60% tier 1, 20% tier 2
    // roll < 20 -> tier 0
    rng.setValues([0.1, 0.19]); // roll=19
    expect(rollHatch(3, rng).heroTier).toBe(0);

    // 20 <= roll < 80 -> tier 1
    rng.setValues([0.1, 0.2]); // roll=20
    expect(rollHatch(3, rng).heroTier).toBe(1);

    rng.setValues([0.1, 0.79]); // roll=79
    expect(rollHatch(3, rng).heroTier).toBe(1);

    // roll >= 80 -> tier 2
    rng.setValues([0.1, 0.8]); // roll=80
    expect(rollHatch(3, rng).heroTier).toBe(2);

    rng.setValues([0.1, 0.99]); // roll=99
    expect(rollHatch(3, rng).heroTier).toBe(2);
  });

  // E16: Tutorial level 1 hatch lần đầu
  it('E16: Tutorial Level 1 lần đầu ép A tier 0, các lần sau và level khác không ép', () => {
    const rng = new MockRandom();
    // Force random to want 'B'
    rng.setValues([0.8, 0.8, 0.8]);

    const l1Reward = rollHatch(1, rng, true);
    expect(l1Reward.kind).toBe('A');
    expect(l1Reward.heroTier).toBe(0);

    // Second hatch in Level 1 (isTutorial = false)
    rng.setValues([0.8]);
    const l1Second = rollHatch(1, rng, false);
    expect(l1Second.kind).toBe('B');

    // Level 2 first hatch (isTutorial = false)
    rng.setValues([0.8, 0.1]);
    const l2Reward = rollHatch(2, rng, false);
    expect(l2Reward.kind).toBe('B');
  });

  // E17: Merge A tier1 + A tier1 -> A tier2
  it('E17: Hai hero A1 ghép ra A2 ATK 4, B1 không ghép với A1', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();

    state.heroes = [
      { id: 'hero-a1-1', kind: 'A', row: 0, col: 0, tier: 1, angle: 0 },
      { id: 'hero-a1-2', kind: 'A', row: 0, col: 1, tier: 1, angle: 0 },
      { id: 'hero-b1-1', kind: 'B', row: 0, col: 2, tier: 1, angle: 0 }
    ];

    // Merge A1 + B1: rejected!
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'hero-b1-1', targetId: 'hero-a1-1' });
    expect(state.heroes.length).toBe(3);
    expect(state.heroes.find((h) => h.id === 'hero-a1-1')?.tier).toBe(1);

    // Merge A1 + A1: accepted!
    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'hero-a1-2', targetId: 'hero-a1-1' });
    expect(state.heroes.length).toBe(2);
    const merged = state.heroes.find((h) => h.id === 'hero-a1-1');
    expect(merged?.tier).toBe(2);
    expect(merged?.kind).toBe('A');
  });

  // E18: Pause/Defeat/Victory đóng băng
  it('E18: Khi Pause/GameOver/Victory, không thể đánh hoặc drag trứng', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(1));
    const state = engine.getState();
    const hero = state.heroes[0];
    const initialHp = state.eggs[0].hp;

    // Pause
    engine.dispatch({ type: 'PAUSE' });
    const hitWhenPaused = engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    expect(hitWhenPaused).toBe(false);
    expect(state.eggs[0].hp).toBe(initialHp);

    engine.dispatch({ type: 'RESUME' });

    // Game Over
    state.isGameOver = true;
    const hitWhenOver = engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    expect(hitWhenOver).toBe(false);
    expect(state.eggs[0].hp).toBe(initialHp);

    // Victory
    state.isGameOver = false;
    state.isVictory = true;
    const hitWhenWin = engine.applyEggDamage(hero, state.eggs[0].id, 'drag');
    expect(hitWhenWin).toBe(false);
    expect(state.eggs[0].hp).toBe(initialHp);
  });

  // E19: Restart giữa level 4 trứng
  it('E19: Restart giữa level có 4 trứng reset đúng 4 trứng về HP/hatchCount ban đầu', () => {
    const engine = new GameEngine(undefined, mockRandom, getLevelConfig(6), 2);
    const state = engine.getState();

    // Damage and hatch some eggs
    state.eggs[0].hp = 1;
    state.eggs[1].hatchCount = 3;
    state.heroes.push({ id: 'temp-hero', kind: 'B', row: 2, col: 2, tier: 1, angle: 0 });

    engine.dispatch({ type: 'RESTART' });

    const fresh = engine.getState();
    expect(fresh.eggs.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(fresh.eggs[i].eggLevel).toBe(2);
      expect(fresh.eggs[i].hp).toBe(5);
      expect(fresh.eggs[i].maxHp).toBe(5);
      expect(fresh.eggs[i].hatchCount).toBe(0);
      expect(fresh.eggs[i].status).toBe('active');
    }
    expect(fresh.heroes.length).toBe(1);
    expect(fresh.heroes[0].tier).toBe(0);
  });

  // E20: 9:16 layout với 5 trứng không chồng lấn
  it('E20: Layout 9:16 với 5 trứng không tràn màn hình và không chồng hitbox', () => {
    const positions = calculateEggPositions(5);
    expect(positions.length).toBe(5);

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      // Fits well within 450px screen width
      expect(p.x - p.radiusX).toBeGreaterThanOrEqual(10);
      expect(p.x + p.radiusX).toBeLessThanOrEqual(GameBalance.SCREEN.WIDTH - 10);

      // Check distance to next egg
      if (i < positions.length - 1) {
        const next = positions[i + 1];
        const distance = next.x - p.x;
        const minNonOverlapDistance = p.radiusX + next.radiusX + GameBalance.EGG.TOUCH_PADDING;
        // Distance between centers must be greater than combined radii + padding
        expect(distance).toBeGreaterThan(minNonOverlapDistance);
      }
    }
  });

  // E21: Replay boss nhiều lần không tăng thêm cấp
  it('E21: Thắng lại Boss 5 nhiều lần không nhân đôi số trứng hoặc tăng cấp vượt mốc', async () => {
    const repo = new InMemoryRepo();
    // Boss 5 must be unlocked before a legitimate victory can be recorded.
    repo.progress.highestUnlockedLevel = 5;
    const campaign = new CampaignController(repo);
    await campaign.init();

    await campaign.recordLevelResult(5, 3, 10);
    expect(campaign.getHighestUnlockedEggLevel()).toBe(2);

    // Replay Boss 5 and win again
    await campaign.recordLevelResult(5, 3, 15);
    expect(campaign.getHighestUnlockedEggLevel()).toBe(2);

    // Level 6 still starts with 4 eggs of level 2
    const engine = new GameEngine(
      undefined,
      mockRandom,
      getLevelConfig(6),
      campaign.getHighestUnlockedEggLevel()
    );
    expect(engine.getState().eggs.length).toBe(4);
    expect(engine.getState().eggs[0].eggLevel).toBe(2);
  });

  // E22: Save cũ không có egg progression
  it('E22: Save version cũ không có trường highestUnlockedEggLevel đọc an toàn không crash', async () => {
    const legacySave = {
      schemaVersion: 1 as const,
      highestUnlockedLevel: 6,
      results: {
        5: { bestStars: 3 as const, bestKills: 12 }
      }
    };

    const repo: ProgressRepository = {
      load: async () => JSON.parse(JSON.stringify(legacySave)),
      save: async () => {},
      reset: async () => {}
    };

    const campaign = new CampaignController(repo);
    await campaign.init();

    // Derived from Level 5 victory
    expect(campaign.getHighestUnlockedEggLevel()).toBe(2);
    expect(campaign.canPlayLevel(6)).toBe(true);
    expect(campaign.getProgress().results[5].bestStars).toBe(3);
  });
});
