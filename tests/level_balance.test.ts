import { describe, expect, it } from 'vitest';
import { LEVELS, getLevelConfig } from '../src/game/config/levels';
import { eggCountForLevel, resolveEggLevel } from '../src/game/domain/EggProgression';

// Explicitly reproduce the signed-off MVP campaign table, rather than
// calculating expected values from the implementation under test.
const CASES = [
  { level: 1, normalCounts: [1, 2, 2], hp: [3, 4, 5], speed: 32 },
  { level: 2, normalCounts: [2, 2, 3], hp: [4, 5, 6], speed: 33 },
  { level: 3, normalCounts: [2, 2, 3, 3], hp: [4, 5, 6, 7], speed: 34 },
  { level: 4, normalCounts: [2, 3, 3, 4], hp: [5, 6, 7, 8], speed: 35 },
  { level: 5, normalCounts: [2, 3, 3, 4, 2], hp: [5, 6, 7, 8, 9], speed: 35 },
  { level: 6, normalCounts: [3, 3, 4, 4], hp: [6, 7, 8, 10], speed: 36 },
  { level: 7, normalCounts: [3, 4, 4, 5], hp: [7, 8, 10, 11], speed: 37 },
  { level: 8, normalCounts: [4, 4, 5, 5], hp: [8, 10, 11, 12], speed: 38 },
  { level: 9, normalCounts: [4, 5, 5, 6], hp: [9, 11, 12, 14], speed: 39 },
  { level: 10, normalCounts: [4, 5, 5, 6, 3], hp: [10, 12, 14, 16, 18], speed: 40 }
] as const;

describe('Phase 8 - campaign balance configuration contract', () => {
  it('has exactly 10 unique, consecutive levels', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
  });

  for (const spec of CASES) {
    it(`Level ${spec.level} matches the agreed wave/HP/speed design`, () => {
      const level = getLevelConfig(spec.level);
      expect(level.baseHP).toBe(3);
      expect(level.waves).toHaveLength(spec.normalCounts.length);

      level.waves.forEach((wave, index) => {
        const normals = wave.enemies.filter((enemy) => enemy.type === 'normal');
        expect(normals, `Level ${spec.level} wave ${index + 1}`).toHaveLength(spec.normalCounts[index]);
        expect(wave.spawnIntervalMs).toBe(2500);
        expect(normals.every((enemy) =>
          enemy.hp === spec.hp[index] &&
          enemy.speed === spec.speed &&
          enemy.escapeDamage === 1
        )).toBe(true);
      });
    });
  }

  it('bosses exist only once, last in the final wave of levels 5 and 10', () => {
    for (const level of LEVELS) {
      const bosses = level.waves.flatMap((wave, index) =>
        wave.enemies.filter((enemy) => enemy.type === 'boss').map((enemy) => ({ enemy, waveIndex: index }))
      );
      const expectedBoss = level.id === 5 || level.id === 10;
      expect(level.isBossLevel).toBe(expectedBoss);
      expect(bosses).toHaveLength(expectedBoss ? 1 : 0);
      if (expectedBoss) {
        expect(bosses[0].waveIndex).toBe(level.waves.length - 1);
        expect(level.waves[level.waves.length - 1].enemies.at(-1)?.type).toBe('boss');
        expect(bosses[0].enemy.escapeDamage).toBe(2);
        expect(bosses[0].enemy.hp).toBe(level.id === 5 ? 40 : 85);
        expect(bosses[0].enemy.speed).toBe(level.id === 5 ? 27 : 29);
      }
    }
  });

  it('egg supply and replay power caps follow the signed-off progression', () => {
    const counts = [1, 2, 2, 3, 3, 4, 4, 4, 4, 4];
    const levelsWithBoss5Won = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];

    for (let levelId = 1; levelId <= 10; levelId++) {
      expect(eggCountForLevel(levelId)).toBe(counts[levelId - 1]);
      expect(resolveEggLevel(levelId, 3)).toBe(levelId <= 5 ? 1 : 2);
      expect(resolveEggLevel(levelId, 2)).toBe(levelsWithBoss5Won[levelId - 1]);
    }
    expect(eggCountForLevel(11)).toBe(5);
    expect(resolveEggLevel(11, 3)).toBe(3);
  });

  it('each normal wave ramps HP within a level; boss HP is higher than final normals', () => {
    for (const level of LEVELS) {
      let lastNormalHp = 0;
      for (const wave of level.waves) {
        const normal = wave.enemies.find((enemy) => enemy.type === 'normal');
        expect(normal).toBeDefined();
        expect(normal!.hp).toBeGreaterThanOrEqual(lastNormalHp);
        lastNormalHp = normal!.hp;
      }
      const boss = level.waves.flatMap((wave) => wave.enemies).find((enemy) => enemy.type === 'boss');
      if (boss) expect(boss.hp).toBeGreaterThan(lastNormalHp);
    }
  });
});
