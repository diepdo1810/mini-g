import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';

describe('GameEngine - Phase 1 logic', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('initializes correctly with 1 hero, initial base HP, and 1 monster in Phase 1', () => {
    const state = engine.getState();
    expect(state.heroes.length).toBe(1);
    expect(state.heroes[0].row).toBe(0);
    expect(state.heroes[0].col).toBe(2);
    expect(state.heroes[0].tier).toBe(0);
    expect(state.baseHp).toBe(GameBalance.BASE.INITIAL_HP);
    expect(state.monsters.length).toBe(1);
    expect(state.monsters[0].hp).toBe(GameBalance.MONSTER.INITIAL_HP);
  });

  it('rotates hero sword and advances monster progress on tick', () => {
    const initialAngle = engine.getState().heroes[0].angle;
    const initialProgress = engine.getState().monsters[0].progress;

    engine.tick(0.1);

    const updatedState = engine.getState();
    expect(updatedState.heroes[0].angle).toBeGreaterThan(initialAngle);
    expect(updatedState.monsters[0].progress).toBeGreaterThan(initialProgress);
  });

  it('deals damage to monster when sword hits, respecting cooldown', () => {
    // Manually position monster in range of hero
    const state = engine.getState();
    const hero = state.heroes[0];
    const monster = state.monsters[0];

    // Align hero weapon angle straight up (-PI/2) and place monster at top edge
    hero.angle = -Math.PI / 2;
    monster.progress = 160; // top center (x=225, y=140)

    const hpBefore = monster.hp;

    // Tick a tiny delta so angle barely changes
    engine.tick(0.001);

    const hpAfter = engine.getState().monsters[0]?.hp ?? 0;
    expect(hpAfter).toBe(hpBefore - 1); // 1 damage dealt

    // Immediate next tick: within cooldown (450ms), so should NOT deal damage again
    engine.tick(0.01);
    expect(engine.getState().monsters[0]?.hp).toBe(hpAfter);

    // After cooldown has expired (advance 0.5s total to clear 0.45s cooldown):
    for (let i = 0; i < 5; i++) {
      engine.tick(0.1);
    }
    // Now align sword and monster for the next hit
    hero.angle = -Math.PI / 2;
    monster.progress = 160;
    engine.tick(0.001);
    expect(engine.getState().monsters[0]?.hp).toBe(hpAfter - 1);
  });

  it('removes monster when HP reaches 0 and increases kills', () => {
    const monster = engine.getState().monsters[0];
    monster.hp = 1;
    const hero = engine.getState().heroes[0];
    hero.angle = -Math.PI / 2;
    monster.progress = 160;

    engine.tick(0.001);

    const state = engine.getState();
    expect(state.monsters.length).toBe(0);
    expect(state.kills).toBe(1);
  });

  it('causes base to lose 1 HP when monster completes a full perimeter lap', () => {
    const state = engine.getState();
    const monster = state.monsters[0];
    // Put monster almost at end of perimeter
    const perimeter = engine.getPathPerimeter();
    monster.progress = perimeter - 1;

    const baseHpBefore = state.baseHp;

    // Advance 10 px
    engine.tick(10 / monster.speed);

    const stateAfter = engine.getState();
    expect(stateAfter.baseHp).toBe(baseHpBefore - 1);
    expect(stateAfter.monsters.length).toBe(0);
  });

  it('guarantees initial hero at (0,2) defeats initial wave 1 monster before it completes the loop', () => {
    // Fresh engine with initial state (1 hero at (0,2), 1 monster at progress 0, speed 32, hp 3)
    const freshEngine = new GameEngine();
    const dt = 1 / 60; // 60 FPS
    const perimeter = freshEngine.getPathPerimeter();
    const maxSeconds = perimeter / GameBalance.MONSTER.INITIAL_WAVE_SPEED;

    let elapsed = 0;
    while (freshEngine.getState().monsters.length > 0 && elapsed < maxSeconds) {
      freshEngine.tick(dt);
      elapsed += dt;
    }

    const finalState = freshEngine.getState();
    // Monster must have been defeated!
    expect(finalState.kills).toBe(1);
    expect(finalState.monsters.length).toBe(0);
    // Base must not take damage!
    expect(finalState.baseHp).toBe(GameBalance.BASE.INITIAL_HP);
  });
});
