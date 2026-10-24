import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';

describe('Phase 4 - Wave Scheduler & Win/Loss Loop', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('T13: Quái chết khi HP 0: bị loại bỏ, kills +1, không gây hại căn cứ', () => {
    const state = engine.getState();
    const monster = state.monsters[0];
    const initialBaseHp = state.baseHp;

    monster.hp = 1;
    // Align hero weapon to kill
    state.heroes[0].angle = -Math.PI / 2;
    monster.progress = 160;

    engine.tick(0.001);

    expect(state.monsters.length).toBe(0);
    expect(state.kills).toBe(1);
    expect(state.baseHp).toBe(initialBaseHp);
  });

  it('T14: Quái đi hết chu vi: bị loại bỏ, căn cứ -1 HP đúng một lần', () => {
    const state = engine.getState();
    const monster = state.monsters[0];
    const initialBaseHp = state.baseHp;
    const perimeter = engine.getPathPerimeter();

    monster.progress = perimeter - 1;
    engine.tick(0.1);

    expect(state.monsters.length).toBe(0);
    expect(state.baseHp).toBe(initialBaseHp - 1);
    expect(state.kills).toBe(0); // not a kill
  });

  it('T15: Base HP về 0: Game Over, đóng băng combat', () => {
    const state = engine.getState();
    state.baseHp = 1;
    const monster = state.monsters[0];
    const perimeter = engine.getPathPerimeter();
    monster.progress = perimeter - 1;

    engine.tick(0.1);

    expect(state.baseHp).toBe(0);
    expect(state.isGameOver).toBe(true);

    // Further ticks do not rotate sword or advance anything
    const angle = state.heroes[0].angle;
    engine.tick(0.5);
    expect(state.heroes[0].angle).toBe(angle);

    // Restart resets cleanly
    engine.dispatch({ type: 'RESTART' });
    const freshState = engine.getState();
    expect(freshState.isGameOver).toBe(false);
    expect(freshState.baseHp).toBe(GameBalance.BASE.INITIAL_HP);
    expect(freshState.wave).toBe(1);
  });

  it('Wave Transition: Sau khi quái Wave 1 chết, đợi 2s rồi chuyển sang Wave 2 và spawn quái mới', () => {
    const state = engine.getState();
    // Kill wave 1 monster
    state.monsters = [];

    // Advance 1s: still in inter-wave delay
    for (let i = 0; i < 10; i++) engine.tick(0.1);
    expect(state.wave).toBe(1);

    // Advance 1.1s more (total 2.1s > 2.0s delay): wave 2 begins!
    for (let i = 0; i < 11; i++) engine.tick(0.1);
    expect(state.wave).toBe(2);

    // Wait 0.5s for initial wave 2 monster spawn
    for (let i = 0; i < 6; i++) engine.tick(0.1);
    expect(state.monsters.length).toBe(1);
    expect(state.monsters[0].hp).toBe(GameBalance.WAVES.CONFIGS[1].monsterHp); // 4 HP

    // Wait 2.5s for 2nd monster of wave 2
    for (let i = 0; i < 26; i++) engine.tick(0.1);
    expect(state.monsters.length).toBe(2);
  });

  it('T16: Vượt qua cả 5 wave, Base HP > 0: Victory', () => {
    const state = engine.getState();
    state.wave = 5;

    // Simulate all 4 monsters of wave 5 spawned and killed
    state.monsters = [];
    (engine as unknown as { monstersSpawnedThisWave: number }).monstersSpawnedThisWave = 4;

    engine.tick(0.1);

    expect(state.isVictory).toBe(true);
    expect(state.isGameOver).toBe(false);
    expect(state.baseHp).toBeGreaterThan(0);
  });

  it('T17: Pause đóng băng di chuyển, vũ khí, cooldown và wave timer', () => {
    const state = engine.getState();
    const heroAngle = state.heroes[0].angle;
    const monsterProgress = state.monsters[0].progress;

    engine.dispatch({ type: 'PAUSE' });
    expect(state.isPaused).toBe(true);

    engine.tick(1.0);
    // Nothing moved during pause
    expect(state.heroes[0].angle).toBe(heroAngle);
    expect(state.monsters[0].progress).toBe(monsterProgress);

    // Resume resumes smoothly
    engine.dispatch({ type: 'RESUME' });
    expect(state.isPaused).toBe(false);
    engine.tick(0.1);
    expect(state.heroes[0].angle).toBeGreaterThan(heroAngle);
    expect(state.monsters[0].progress).toBeGreaterThan(monsterProgress);
  });

  it('T18: Lặp Restart nhiều lần trạng thái luôn sạch sẽ', () => {
    for (let i = 0; i < 5; i++) {
      engine.tick(0.5);
      engine.dispatch({ type: 'RESTART' });
      const state = engine.getState();
      expect(state.wave).toBe(1);
      expect(state.baseHp).toBe(3);
      expect(state.kills).toBe(0);
      expect(state.heroes.length).toBe(1);
      expect(state.heroes[0].row).toBe(0);
      expect(state.heroes[0].col).toBe(2);
      expect(state.egg.hp).toBe(3);
      expect(state.isGameOver).toBe(false);
      expect(state.isVictory).toBe(false);
    }
  });
});
