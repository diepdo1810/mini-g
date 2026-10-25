import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { LEVELS, getLevelConfig, type LevelConfig } from '../src/game/config/levels';

describe('Phase 7 - Boss wave lifecycle and escape regression', () => {
  it('spawns exactly one boss at the end of the final wave of Level 5 and 10', () => {
    for (const level of LEVELS) {
      const bosses = level.waves.flatMap((wave, waveIndex) =>
        wave.enemies
          .filter((enemy) => enemy.type === 'boss')
          .map((enemy) => ({ waveIndex, enemy }))
      );

      expect(level.isBossLevel).toBe(level.id === 5 || level.id === 10);
      expect(bosses.length).toBe(level.isBossLevel ? 1 : 0);

      if (level.isBossLevel) {
        const finalWave = level.waves[level.waves.length - 1];
        expect(finalWave.enemies[finalWave.enemies.length - 1].type).toBe('boss');
        expect(bosses[0].waveIndex).toBe(level.waves.length - 1);
        expect(bosses[0].enemy.escapeDamage).toBe(2);
        expect(bosses[0].enemy.speed).toBeLessThan(finalWave.enemies[0].speed);
        expect(bosses[0].enemy.hp).toBeGreaterThan(finalWave.enemies[0].hp * 4);
      }
    }
  });

  it('wave stays active until the last boss is defeated', () => {
    const bossWave = getLevelConfig(5).waves[4];
    const oneWave: LevelConfig = {
      ...getLevelConfig(5),
      waves: [{ ...bossWave, spawnIntervalMs: 100 }]
    };
    const engine = new GameEngine(undefined, undefined, oneWave);
    const state = engine.getState();

    // Simulate defeating the first normal enemy.
    state.monsters = [];
    engine.tick(0.1); // second normal enemy
    state.monsters = [];
    engine.tick(0.1); // boss
    expect(state.monsters).toHaveLength(1);
    expect(state.monsters[0].type).toBe('boss');
    expect(state.isVictory).toBe(false);

    engine.tick(0.1);
    expect(state.isVictory).toBe(false);

    state.monsters = []; // boss defeated
    engine.tick(0.1);
    expect(state.isVictory).toBe(true);
    expect(state.isGameOver).toBe(false);
  });

  it('final Boss can escape and level still wins with one remaining Base HP', () => {
    const boss = getLevelConfig(5).waves[4].enemies[2];
    const oneWave: LevelConfig = {
      ...getLevelConfig(5),
      waves: [{ spawnIntervalMs: 2500, enemies: [boss] }]
    };
    const engine = new GameEngine(undefined, undefined, oneWave);
    const state = engine.getState();
    state.monsters[0].progress = engine.getPathPerimeter() - 0.01;

    engine.tick(0.01);
    expect(state.baseHp).toBe(1);
    expect(state.kills).toBe(0);
    expect(state.monsters).toHaveLength(0);
    expect(state.isGameOver).toBe(false);
    expect(state.isVictory).toBe(true);
  });

  it('simultaneous normal and boss escape clamps Base HP, does not award kills or victory', () => {
    const boss = getLevelConfig(5).waves[4].enemies[2];
    const normal = getLevelConfig(5).waves[4].enemies[0];
    const oneWave: LevelConfig = {
      ...getLevelConfig(5),
      waves: [{ spawnIntervalMs: 2500, enemies: [boss] }]
    };
    const engine = new GameEngine(undefined, undefined, oneWave);
    const state = engine.getState();
    const perimeter = engine.getPathPerimeter();

    state.monsters[0].progress = perimeter - 0.01;
    state.monsters.push({
      id: 'normal-extra',
      type: normal.type,
      escapeDamage: normal.escapeDamage,
      hp: normal.hp,
      maxHp: normal.hp,
      speed: normal.speed,
      progress: perimeter - 0.01
    });

    engine.tick(0.01);
    expect(state.baseHp).toBe(0);
    expect(state.kills).toBe(0);
    expect(state.monsters).toHaveLength(0);
    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);

    engine.tick(0.1);
    expect(state.baseHp).toBe(0);
  });
});
