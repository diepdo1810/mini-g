import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';

describe('Phase 5 QA & Playtest Verification', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('P0.1: Đòn kiếm đồng thời chạm cả quái và trứng: tính độc lập, không lẫn HP/cooldown', () => {
    const state = engine.getState();
    // Place hero at bottom center (4, 2)
    state.heroes = [
      { id: 'hero-bottom', kind: 'A', row: 4, col: 2, tier: 0, angle: Math.PI / 2 }
    ];

    // Place a monster right on bottom path segment passing below (4, 2)
    // Bottom path is at Y=460. Path left is 65, right is 385, top is 140, bottom is 460.
    // Segment 1 (top): 320 px. Segment 2 (right): 320 px.
    // Segment 3 (bottom): right to left.
    // Progress for bottom center (x=225): 320 + 320 + (385 - 225) = 640 + 160 = 800 px.
    state.monsters = [
      { id: 'monster-bottom', hp: 3, maxHp: 3, progress: 800, speed: 32 }
    ];

    const initialMonsterHp = state.monsters[0].hp;
    const initialEggHp = state.egg.hp;

    // Both egg (center Y=516) and monster (Y=460) are in downward path of sword (reaches Y=492)
    engine.tick(0.001);

    // Both should receive damage independently!
    expect(state.monsters[0].hp).toBe(initialMonsterHp - 1);
    expect(state.egg.hp).toBe(initialEggHp - 1);

    // Next tick within cooldown: neither receives damage
    engine.tick(0.01);
    expect(state.monsters[0].hp).toBe(initialMonsterHp - 1);
    expect(state.egg.hp).toBe(initialEggHp - 1);
  });

  it('P0.3: Game Over được ưu tiên tuyệt đối khi quái cuối wave 5 thoát làm Base HP = 0', () => {
    const state = engine.getState();
    state.wave = 5;
    state.baseHp = 1;

    // Last monster of wave 5 escapes
    const perimeter = engine.getPathPerimeter();
    state.monsters = [
      { id: 'final-monster', hp: 5, maxHp: 12, progress: perimeter - 1, speed: 40 }
    ];
    (engine as unknown as { monstersSpawnedThisWave: number }).monstersSpawnedThisWave = 4;

    engine.tick(0.1);

    // Base HP drops to 0 -> GAME OVER, strictly NOT Victory!
    expect(state.baseHp).toBe(0);
    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);
  });

  it('P0.3: Inter-wave timer KHÔNG được đếm ngầm khi đang Pause', () => {
    const state = engine.getState();
    // Wave 1 cleared
    state.monsters = [];

    // Pause the game
    engine.dispatch({ type: 'PAUSE' });

    // Tick 5 seconds while paused
    for (let i = 0; i < 50; i++) {
      engine.tick(0.1);
    }

    // Must still be Wave 1 because timer was frozen during pause!
    expect(state.wave).toBe(1);

    // Resume
    engine.dispatch({ type: 'RESUME' });
    // After 4.1s of active play, wave 2 begins
    for (let i = 0; i < 41; i++) {
      engine.tick(0.1);
    }
    expect(state.wave).toBe(2);
  });

  it('P0.3: 10 lần Restart liên tục không rò rỉ trạng thái cũ', () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      // Simulate play: spawn heroes, damage, tick
      engine.getState().heroes.push({
        id: `hero-temp-${cycle}`,
        kind: 'B',
        row: 1,
        col: 1,
        tier: 2,
        angle: 1.5
      });
      engine.getState().kills = 15;
      engine.getState().wave = 4;
      engine.getState().baseHp = 1;
      engine.getState().egg.hp = 15;
      engine.getState().egg.hatchCount = 6;
      engine.tick(0.2);

      // Restart
      engine.dispatch({ type: 'RESTART' });

      // Invariants must be 100% pristine
      const s = engine.getState();
      expect(s.wave).toBe(1);
      expect(s.baseHp).toBe(3);
      expect(s.kills).toBe(0);
      expect(s.heroes.length).toBe(1);
      expect(s.heroes[0].id).toBe('hero-1');
      expect(s.heroes[0].kind).toBe('A');
      expect(s.heroes[0].row).toBe(0);
      expect(s.heroes[0].col).toBe(2);
      expect(s.heroes[0].tier).toBe(0);
      expect(s.egg.hp).toBe(3);
      expect(s.egg.maxHp).toBe(3);
      expect(s.egg.hatchCount).toBe(0);
      expect(s.egg.readyToHatch).toBe(false);
      expect(s.monsters.length).toBe(1);
      expect(s.isGameOver).toBe(false);
      expect(s.isVictory).toBe(false);
      expect(s.isPaused).toBe(false);
    }
  });

  it('P1 Playtest kịch bản 1: Không thao tác (AFK playtest)', () => {
    // Let simulation run completely hands-off
    const dt = 1 / 30;
    let totalSeconds = 0;
    const maxSimulationSeconds = 300; // 5 minutes max

    while (
      !engine.getState().isGameOver &&
      !engine.getState().isVictory &&
      totalSeconds < maxSimulationSeconds
    ) {
      engine.tick(dt);
      totalSeconds += dt;
    }

    const finalState = engine.getState();
    // In AFK mode, player must eventually lose because wave 2+ monsters escape
    expect(finalState.isGameOver).toBe(true);
    expect(finalState.isVictory).toBe(false);
    expect(finalState.baseHp).toBe(0);
    // Kills must be at least 1 (initial hero at (0,2) kills wave 1 monster)
    expect(finalState.kills).toBeGreaterThanOrEqual(1);
  });

  it('P1 Playtest kịch bản 2: Chơi chủ động dẫn tới VICTORY', () => {
    // Active player strategy:
    // 1. Hero at (0,2) damages egg to hatch Hero 2 at (4,2).
    // 2. Both heroes' weapons rotate, damaging both eggs and monsters along top & bottom paths!
    // 3. Move/merge heroes to reach tier 1 & 2.
    // 4. Verify all 5 waves can be survived to trigger Victory!

    const s = engine.getState();
    const hero1 = s.heroes[0];

    // Hatch egg 1 -> spawns hero 2 at (4, 2)
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: hero1.id });
    }
    for (let t = 0; t < 26; t++) engine.tick(0.1);
    expect(s.heroes.length).toBe(2);

    // Merge hero1 and hero2 when needed or hatch more heroes
    // Simulate active player upgrading defense
    s.heroes.push({
      id: 'hero-east',
      kind: 'A',
      row: 2,
      col: 4, // covers right path
      tier: 1,
      angle: 0
    });
    s.heroes.push({
      id: 'hero-west',
      kind: 'A',
      row: 2,
      col: 0, // covers left path
      tier: 1,
      angle: Math.PI
    });

    // Run combat through wave 5
    const dt = 0.05;
    let elapsed = 0;
    while (!s.isVictory && !s.isGameOver && elapsed < 400) {
      engine.tick(dt);
      elapsed += dt;
    }

    // With 4 well-positioned tier 1 heroes guarding all 4 sides, base survives!
    expect(s.isVictory).toBe(true);
    expect(s.isGameOver).toBe(false);
    expect(s.baseHp).toBeGreaterThan(0);
    expect(s.wave).toBe(5);
  });
});
