import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { getLevelConfig, type EnemySpawnConfig, type LevelConfig } from '../src/game/config/levels';

function oneEnemyLevel(enemy: EnemySpawnConfig, levelId = 5): LevelConfig {
  return {
    ...getLevelConfig(levelId),
    waves: [{ spawnIntervalMs: 2500, enemies: [enemy] }]
  };
}

const boss5 = getLevelConfig(5).waves[4].enemies[2];
const boss10 = getLevelConfig(10).waves[4].enemies[3];
const normal = getLevelConfig(1).waves[0].enemies[0];

function forceEscape(engine: GameEngine): void {
  const enemy = engine.getState().monsters[0];
  enemy.progress = engine.getPathPerimeter() - 0.01;
  engine.tick(0.01);
}

describe('Issue #13 - boss spawn and escape damage', () => {
  it.each([
    ['Level 5', boss5, 40, 27],
    ['Level 10', boss10, 85, 29]
  ])('%s: boss preserves type, HP, speed and escape damage at initial spawn', (_, config, hp, speed) => {
    const engine = new GameEngine(undefined, undefined, oneEnemyLevel(config));
    const monster = engine.getState().monsters[0];
    expect(monster.type).toBe('boss');
    expect(monster.maxHp).toBe(hp);
    expect(monster.hp).toBe(hp);
    expect(monster.speed).toBe(speed);
    expect(monster.escapeDamage).toBe(2);
  });

  it('timed spawn preserves monster metadata', () => {
    const level: LevelConfig = {
      ...getLevelConfig(5),
      waves: [{ spawnIntervalMs: 100, enemies: [normal, boss5] }]
    };
    const engine = new GameEngine(undefined, undefined, level);
    engine.tick(0.1);
    const monsters = engine.getState().monsters;
    expect(monsters).toHaveLength(2);
    expect(monsters[0].type).toBe('normal');
    expect(monsters[0].escapeDamage).toBe(1);
    expect(monsters[1].type).toBe('boss');
    expect(monsters[1].escapeDamage).toBe(2);
  });

  it.each([
    [3, 1, false],
    [2, 0, true],
    [1, 0, true]
  ])('boss escape when Base HP=%i results in HP=%i, Game Over=%s', (initialHp, remainingHp, gameOver) => {
    const engine = new GameEngine(undefined, undefined, oneEnemyLevel(boss5));
    const state = engine.getState();
    state.baseHp = initialHp;
    forceEscape(engine);

    expect(state.baseHp).toBe(remainingHp);
    expect(state.isGameOver).toBe(gameOver);
    expect(state.kills).toBe(0);
    expect(state.monsters).toHaveLength(0);

    engine.tick(0.1);
    expect(state.baseHp).toBe(remainingHp); // never damage twice
    if (gameOver) expect(state.isVictory).toBe(false);
  });

  it('normal enemy escape deducts exactly one Base HP', () => {
    const engine = new GameEngine(undefined, undefined, oneEnemyLevel(normal, 1));
    const state = engine.getState();
    expect(state.monsters[0].type).toBe('normal');
    forceEscape(engine);
    expect(state.baseHp).toBe(2);
    expect(state.kills).toBe(0);
  });

  it('a lethal sword hit on escape tick wins over the boss escape', () => {
    const engine = new GameEngine(undefined, undefined, oneEnemyLevel(boss5));
    const state = engine.getState();
    const boss = state.monsters[0];
    boss.hp = 1;
    boss.progress = engine.getPathPerimeter() - 0.01;
    const hero = state.heroes[0];
    hero.row = 0;
    hero.col = 0; // close to path start/end corner (65, 140)
    hero.angle = -3 * Math.PI / 4 - GameBalance.SWORD.ANGULAR_SPEED * 0.001;

    engine.tick(0.001);
    expect(state.kills).toBe(1);
    expect(state.baseHp).toBe(3);
    expect(state.monsters).toHaveLength(0);
  });

  it('pause freezes a boss; resume permits escape; restart restores configured metadata', () => {
    const engine = new GameEngine(undefined, undefined, oneEnemyLevel(boss10, 10));
    const state = engine.getState();
    state.monsters[0].progress = engine.getPathPerimeter() - 0.01;

    engine.dispatch({ type: 'PAUSE' });
    engine.tick(0.1);
    expect(state.baseHp).toBe(3);
    expect(state.monsters).toHaveLength(1);

    engine.dispatch({ type: 'RESUME' });
    engine.tick(0.1);
    expect(state.baseHp).toBe(1);
    expect(state.monsters).toHaveLength(0);

    engine.dispatch({ type: 'RESTART' });
    const fresh = engine.getState();
    expect(fresh.baseHp).toBe(3);
    expect(fresh.monsters[0].type).toBe('boss');
    expect(fresh.monsters[0].escapeDamage).toBe(2);
  });
});
