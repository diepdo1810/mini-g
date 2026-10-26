import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { isPointInEggArea } from '../src/game/domain/EggMath';

describe('Phase 2 - Egg Combat & Drag Logic', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('reduces egg HP by hero ATK on ATTACK_EGG action', () => {
    const hero = engine.getState().heroes[0];
    const initialHp = engine.getState().egg.hp;
    expect(initialHp).toBe(3);

    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });

    const stateAfter = engine.getState();
    expect(stateAfter.egg.hp).toBe(2);
    expect(stateAfter.egg.readyToHatch).toBe(false);

    // Verifies hero is still at (0, 2)
    expect(hero.row).toBe(0);
    expect(hero.col).toBe(2);
  });

  it('respects 250ms cooldown between egg attacks from the same hero', () => {
    const hero = engine.getState().heroes[0];

    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(2);

    // Immediate second dispatch within cooldown: must be ignored
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(2);

    // Advance 0.1s: still in cooldown (0.25s)
    engine.tick(0.1);
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(2);

    // Advance 0.2s more (total 0.3s > 0.25s): cooldown expired
    engine.tick(0.1);
    engine.tick(0.1);
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(1);
  });

  it('marks readyToHatch when egg HP reaches 0 after 3 hits', () => {
    const hero = engine.getState().heroes[0];

    // Hit 1
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(2);

    // Cooldown pass (3 ticks of 0.1s to exceed 0.25s cooldown)
    engine.tick(0.1);
    engine.tick(0.1);
    engine.tick(0.1);

    // Hit 2
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.hp).toBe(1);

    // Cooldown pass
    engine.tick(0.1);
    engine.tick(0.1);
    engine.tick(0.1);

    // Break resets egg immediately; independent reward incubates for 2.5 seconds.
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    expect(engine.getState().egg.readyToHatch).toBe(false);
    expect(engine.getState().hatchQueue).toHaveLength(1);
    expect(engine.getState().egg.hatchCount).toBe(1);
    expect(engine.getState().egg.hp).toBe(5);
    expect(engine.getState().heroes).toHaveLength(1);

    for (let i = 0; i < 26; i++) engine.tick(0.1);
    expect(engine.getState().heroes).toHaveLength(2);
    expect(engine.getState().hatchQueue).toHaveLength(0);
  });

  it('verifies point in egg area correctly', () => {
    const centerX = GameBalance.EGG.CENTER_X;
    const centerY = GameBalance.EGG.CENTER_Y;

    // Center is inside
    expect(isPointInEggArea(centerX, centerY)).toBe(true);

    // Edge point within radius + padding
    expect(isPointInEggArea(centerX, centerY + GameBalance.EGG.RADIUS_Y)).toBe(true);

    // Distant points outside
    expect(isPointInEggArea(centerX, centerY + GameBalance.EGG.RADIUS_Y + 30)).toBe(false);
    expect(isPointInEggArea(50, 100)).toBe(false); // Inside board
  });

  it('does not stop sword rotation or monster movement when attacking egg', () => {
    const hero = engine.getState().heroes[0];
    const initialAngle = hero.angle;

    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });
    engine.tick(0.05);

    expect(hero.angle).toBeGreaterThan(initialAngle);
  });
});
