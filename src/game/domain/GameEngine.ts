import { GameBalance } from '../config/GameBalance';
import { createInitialState, type GameState } from './GameState';
import type { GameAction } from './GameActions';
import type { Point, Hero, Egg } from './types';
import { getPerimeter, getPositionOnPath } from './PathMath';
import { isSwordHittingMonster, isSwordHittingEgg } from './HitDetection';
import { DefaultRandomSource, type RandomSource } from './RandomSource';
import type { LevelConfig } from '../config/levels';
import {
  createEggsForLevel,
  calculateEggMaxHp,
  rollHatch
} from './EggProgression';

function createLegacy5WaveConfig(): LevelConfig {
  return {
    id: 1,
    baseHP: GameBalance.BASE.INITIAL_HP,
    isBossLevel: false,
    waves: GameBalance.WAVES.CONFIGS.map((cfg) => ({
      spawnIntervalMs: GameBalance.WAVES.SPAWN_INTERVAL * 1000,
      enemies: Array.from({ length: cfg.monsterCount }, () => ({
        type: 'normal',
        hp: cfg.monsterHp,
        speed: cfg.monsterSpeed,
        escapeDamage: 1
      }))
    }))
  };
}

export class GameEngine {
  private state: GameState;
  private currentLevel: LevelConfig;
  private highestUnlockedEggLevel = 1;
  private totalHatchesInMatch = 0;
  private hitCooldowns: Map<string, number> = new Map();
  private eggOrbitCooldowns: Map<string, number> = new Map();
  private eggDragCooldowns: Map<string, number> = new Map();
  private lastEggHitTick: Map<string, number> = new Map();
  private currentTick = 0;
  private randomSource: RandomSource;

  private nextHeroId = 2;
  private nextDamageId = 1;
  private nextMonsterId = 2;

  // Wave Scheduler State
  private enemySpawnIndex = 0;
  private spawnTimer = 2.5;
  private interWaveTimer = 2.0;

  constructor(
    initialState?: GameState,
    randomSource?: RandomSource,
    levelConfig?: LevelConfig,
    highestUnlockedEggLevel: number = 1
  ) {
    this.currentLevel = levelConfig ?? createLegacy5WaveConfig();
    this.randomSource = randomSource ?? new DefaultRandomSource();
    this.highestUnlockedEggLevel = highestUnlockedEggLevel;

    if (initialState) {
      this.state = initialState;
      if (!this.state.eggs || this.state.eggs.length === 0) {
        if (this.state.egg) {
          if (this.state.egg.x === undefined) {
            this.state.egg.x = GameBalance.EGG.CENTER_X;
            this.state.egg.y = GameBalance.EGG.CENTER_Y;
            this.state.egg.radiusX = GameBalance.EGG.RADIUS_X;
            this.state.egg.radiusY = GameBalance.EGG.RADIUS_Y;
            this.state.egg.slotIndex = 0;
            this.state.egg.eggLevel = 1;
            this.state.egg.status = 'active';
            this.state.egg.pendingHero = null;
          }
          this.state.eggs = [this.state.egg];
        } else {
          this.state.eggs = createEggsForLevel(this.currentLevel.id, this.highestUnlockedEggLevel);
        }
      }
    } else {
      this.state = createInitialState(
        this.currentLevel.id,
        this.currentLevel.waves.length,
        this.highestUnlockedEggLevel
      );
    }

    // Initial spawn of first monster for wave 1
    if (this.state.monsters.length === 0 && this.currentLevel.waves.length > 0) {
      const firstWave = this.currentLevel.waves[0];
      if (firstWave && firstWave.enemies.length > 0) {
        const firstEnemy = firstWave.enemies[0];
        this.state.monsters.push({
          id: 'monster-1',
          hp: firstEnemy.hp,
          maxHp: firstEnemy.hp,
          progress: 0,
          speed: firstEnemy.speed,
          type: firstEnemy.type,
          escapeDamage: firstEnemy.escapeDamage
        });
        this.enemySpawnIndex = 1;
        this.spawnTimer = firstWave.spawnIntervalMs / 1000;
      }
    } else if (this.state.monsters.length > 0) {
      this.enemySpawnIndex = this.state.monsters.length;
    }
  }

  public get monstersSpawnedThisWave(): number {
    return this.enemySpawnIndex;
  }

  public set monstersSpawnedThisWave(val: number) {
    this.enemySpawnIndex = val;
  }

  public getState(): GameState {
    return this.state;
  }

  public getCurrentLevel(): LevelConfig {
    return this.currentLevel;
  }

  public getHighestUnlockedEggLevel(): number {
    return this.highestUnlockedEggLevel;
  }

  public startLevel(levelConfig: LevelConfig, highestUnlockedEggLevel?: number): GameState {
    this.currentLevel = levelConfig;
    if (highestUnlockedEggLevel !== undefined) {
      this.highestUnlockedEggLevel = highestUnlockedEggLevel;
    }
    this.state = createInitialState(
      levelConfig.id,
      levelConfig.waves.length,
      this.highestUnlockedEggLevel
    );
    this.totalHatchesInMatch = 0;
    this.hitCooldowns.clear();
    this.eggOrbitCooldowns.clear();
    this.eggDragCooldowns.clear();
    this.lastEggHitTick.clear();
    this.currentTick = 0;
    this.nextDamageId = 1;
    this.nextHeroId = 2;
    this.nextMonsterId = 2;

    const firstWave = levelConfig.waves[0];
    if (firstWave && firstWave.enemies.length > 0) {
      const firstEnemy = firstWave.enemies[0];
      this.state.monsters.push({
        id: 'monster-1',
        hp: firstEnemy.hp,
        maxHp: firstEnemy.hp,
        progress: 0,
        speed: firstEnemy.speed,
        type: firstEnemy.type,
        escapeDamage: firstEnemy.escapeDamage
      });
      this.enemySpawnIndex = 1;
      this.spawnTimer = firstWave.spawnIntervalMs / 1000;
    } else {
      this.enemySpawnIndex = 0;
      this.spawnTimer = 2.5;
    }
    this.interWaveTimer = 2.0;

    return this.state;
  }

  public restartLevel(): GameState {
    return this.startLevel(this.currentLevel, this.highestUnlockedEggLevel);
  }

  public getEggAtPoint(x: number, y: number): Egg | null {
    let closestEgg: Egg | null = null;
    let minDistanceSq = Infinity;

    for (const egg of this.state.eggs) {
      const rx = egg.radiusX + GameBalance.EGG.TOUCH_PADDING;
      const ry = egg.radiusY + GameBalance.EGG.TOUCH_PADDING;
      const dx = x - egg.x;
      const dy = y - egg.y;

      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestEgg = egg;
        }
      }
    }

    return closestEgg;
  }

  public getHeroCenter(hero: Hero): Point {
    return {
      x: GameBalance.BOARD.X + (hero.col + 0.5) * GameBalance.BOARD.CELL_SIZE,
      y: GameBalance.BOARD.Y + (hero.row + 0.5) * GameBalance.BOARD.CELL_SIZE
    };
  }

  public getPathPerimeter(): number {
    return getPerimeter(GameBalance.PATH.RECT);
  }

  public getEmptyCells(): Array<{ row: number; col: number }> {
    const occupied = new Set(this.state.heroes.map((h) => `${h.row},${h.col}`));
    const empty: Array<{ row: number; col: number }> = [];

    for (let r = 0; r < GameBalance.BOARD.ROWS; r++) {
      for (let c = 0; c < GameBalance.BOARD.COLS; c++) {
        if (!occupied.has(`${r},${c}`)) {
          empty.push({ row: r, col: c });
        }
      }
    }
    return empty;
  }

  public applyEggDamage(
    hero: Hero,
    eggIdOrSource?: string,
    sourceOrUndefined?: 'orbit' | 'drag'
  ): boolean {
    if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return false;

    let eggId: string | undefined;
    let source: 'orbit' | 'drag' = 'orbit';

    if (eggIdOrSource === 'orbit' || eggIdOrSource === 'drag') {
      source = eggIdOrSource;
      eggId = undefined;
    } else {
      eggId = eggIdOrSource;
      source = sourceOrUndefined ?? 'orbit';
    }

    const targetEgg = eggId
      ? this.state.eggs.find((e) => e.id === eggId)
      : this.state.eggs[0];

    if (!targetEgg) return false;
    if (targetEgg.status === 'pending' || targetEgg.readyToHatch) return false;

    const eggPairKey = `${hero.id}:${targetEgg.id}`;

    // Deduplicate if both orbit and drag happen in the same simulation tick on the same egg
    if (this.lastEggHitTick.get(eggPairKey) === this.currentTick) return false;

    if (source === 'drag') {
      const cd = this.eggDragCooldowns.get(eggPairKey) ?? 0;
      if (cd > 0) return false;
      this.eggDragCooldowns.set(eggPairKey, GameBalance.EGG.DRAG_COOLDOWN_MS / 1000);
      // Suppress immediate orbit hit to prevent double hit
      this.eggOrbitCooldowns.set(
        eggPairKey,
        Math.max(
          this.eggOrbitCooldowns.get(eggPairKey) ?? 0,
          GameBalance.EGG.DRAG_COOLDOWN_MS / 1000
        )
      );
    } else {
      const cd = this.eggOrbitCooldowns.get(eggPairKey) ?? 0;
      if (cd > 0) return false;
      this.eggOrbitCooldowns.set(eggPairKey, GameBalance.EGG.ORBIT_COOLDOWN_MS / 1000);
    }

    this.lastEggHitTick.set(eggPairKey, this.currentTick);

    const atk = Math.max(1, 2 ** hero.tier);
    targetEgg.hp = Math.max(0, targetEgg.hp - atk);

    // Spawn floating damage on egg
    this.state.damageNumbers.push({
      id: `dmg-${this.nextDamageId++}`,
      x: targetEgg.x,
      y: targetEgg.y - 20,
      amount: atk,
      life: 0.6,
      maxLife: 0.6
    });

    if (targetEgg.hp === 0) {
      targetEgg.status = 'pending';
      targetEgg.readyToHatch = true;
      this.tryHatchEggs();
    }

    return true;
  }

  public tryHatchEggs(): boolean {
    if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return false;

    const pendingEggs = this.state.eggs
      .filter((e) => e.status === 'pending' || e.readyToHatch)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    if (pendingEggs.length === 0) return false;

    let hatchedAny = false;

    for (const egg of pendingEggs) {
      const emptyCells = this.getEmptyCells();
      const isTutorial =
        this.state.currentLevelId === 1 &&
        egg.slotIndex === 0 &&
        egg.hatchCount === 0 &&
        this.totalHatchesInMatch === 0;

      if (emptyCells.length === 0) {
        if (!egg.pendingHero) {
          egg.pendingHero = rollHatch(egg.eggLevel, this.randomSource, isTutorial);
        }
        this.state.notification = {
          text: 'Bàn cờ đầy — hãy ghép nhân vật!',
          color: '#f59e0b',
          life: 2.0
        };
        continue;
      }

      let cell: { row: number; col: number };
      if (isTutorial) {
        // First hatch in Level 1: prioritized spawn at (row=4, col=2)
        const targetCell = emptyCells.find((c) => c.row === 4 && c.col === 2);
        if (targetCell) {
          cell = targetCell;
        } else {
          const bottomRowCell = emptyCells.find((c) => c.row === 4);
          cell = bottomRowCell ?? this.randomSource.choose(emptyCells);
        }
      } else {
        cell = this.randomSource.choose(emptyCells);
      }

      const reward =
        egg.pendingHero ?? rollHatch(egg.eggLevel, this.randomSource, isTutorial);

      const newHero: Hero = {
        id: `hero-${this.nextHeroId++}`,
        kind: reward.kind,
        row: cell.row,
        col: cell.col,
        tier: reward.heroTier,
        angle: 0
      };

      this.state.heroes.push(newHero);
      egg.hatchCount += 1;
      this.totalHatchesInMatch += 1;

      // Reset egg with increased HP
      const nextMaxHp = calculateEggMaxHp(egg.eggLevel, egg.hatchCount);
      egg.status = 'active';
      egg.pendingHero = null;
      egg.readyToHatch = false;
      egg.maxHp = nextMaxHp;
      egg.hp = nextMaxHp;

      // Clean up cooldowns for this egg
      for (const key of this.eggOrbitCooldowns.keys()) {
        if (key.endsWith(`:${egg.id}`)) this.eggOrbitCooldowns.delete(key);
      }
      for (const key of this.eggDragCooldowns.keys()) {
        if (key.endsWith(`:${egg.id}`)) this.eggDragCooldowns.delete(key);
      }
      for (const key of this.lastEggHitTick.keys()) {
        if (key.endsWith(`:${egg.id}`)) this.lastEggHitTick.delete(key);
      }

      this.state.notification = {
        text: `+Hero ${reward.kind} (ATK ${2 ** reward.heroTier})`,
        color: reward.kind === 'A' ? '#38bdf8' : '#34d399',
        life: 2.0
      };

      hatchedAny = true;
    }

    return hatchedAny;
  }

  public tryHatchEgg(): boolean {
    return this.tryHatchEggs();
  }

  public dispatch(action: GameAction): void {
    switch (action.type) {
      case 'PAUSE':
        this.state.isPaused = true;
        break;
      case 'RESUME':
        this.state.isPaused = false;
        break;
      case 'RESTART':
        this.restartLevel();
        break;

      case 'ATTACK_EGG': {
        const hero = this.state.heroes.find((h) => h.id === action.heroId);
        if (hero) {
          this.applyEggDamage(hero, action.eggId, 'drag');
        }
        break;
      }

      case 'MOVE_HERO': {
        if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return;

        const { targetRow, targetCol, heroId } = action;
        if (
          targetRow < 0 ||
          targetRow >= GameBalance.BOARD.ROWS ||
          targetCol < 0 ||
          targetCol >= GameBalance.BOARD.COLS
        ) {
          return;
        }

        const hero = this.state.heroes.find((h) => h.id === heroId);
        if (!hero) return;

        const isOccupied = this.state.heroes.some(
          (h) => h.row === targetRow && h.col === targetCol
        );
        if (isOccupied) return;

        hero.row = targetRow;
        hero.col = targetCol;
        break;
      }

      case 'MERGE_HERO': {
        if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return;
        if (action.sourceId === action.targetId) return;

        const source = this.state.heroes.find((h) => h.id === action.sourceId);
        const target = this.state.heroes.find((h) => h.id === action.targetId);
        if (!source || !target) return;

        if (source.kind === target.kind && source.tier === target.tier) {
          const oldAtk = 2 ** target.tier;
          target.tier += 1;
          const newAtk = 2 ** target.tier;

          this.state.heroes = this.state.heroes.filter((h) => h.id !== source.id);

          for (const key of this.hitCooldowns.keys()) {
            if (key.startsWith(`${source.id}:`)) {
              this.hitCooldowns.delete(key);
            }
          }
          for (const key of this.eggOrbitCooldowns.keys()) {
            if (key.startsWith(`${source.id}:`)) {
              this.eggOrbitCooldowns.delete(key);
            }
          }
          for (const key of this.eggDragCooldowns.keys()) {
            if (key.startsWith(`${source.id}:`)) {
              this.eggDragCooldowns.delete(key);
            }
          }

          this.state.notification = {
            text: `MERGE ${target.kind} ${oldAtk} → ${newAtk}`,
            color: '#facc15',
            life: 2.0
          };

          this.tryHatchEgg();
        } else {
          this.state.notification = {
            text: 'Khác loại hoặc cấp!',
            color: '#f87171',
            life: 1.5
          };
        }
        break;
      }

      default:
        break;
    }
  }

  public tick(rawDeltaSeconds: number): void {
    if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) {
      return;
    }

    this.currentTick += 1;
    const dt = Math.min(rawDeltaSeconds, GameBalance.COMBAT.MAX_DELTA_SECONDS);
    const perimeter = this.getPathPerimeter();

    // 1. Update cooldown timers
    for (const [key, remaining] of this.hitCooldowns.entries()) {
      const nextTime = remaining - dt;
      if (nextTime <= 0) {
        this.hitCooldowns.delete(key);
      } else {
        this.hitCooldowns.set(key, nextTime);
      }
    }

    for (const [key, remaining] of this.eggOrbitCooldowns.entries()) {
      const nextTime = remaining - dt;
      if (nextTime <= 0) {
        this.eggOrbitCooldowns.delete(key);
      } else {
        this.eggOrbitCooldowns.set(key, nextTime);
      }
    }

    for (const [key, remaining] of this.eggDragCooldowns.entries()) {
      const nextTime = remaining - dt;
      if (nextTime <= 0) {
        this.eggDragCooldowns.delete(key);
      } else {
        this.eggDragCooldowns.set(key, nextTime);
      }
    }

    // 2. Wave Scheduler: Spawn enemies according to current wave config
    const currentWaveIndex = Math.min(this.state.wave - 1, this.currentLevel.waves.length - 1);
    const currentWave = this.currentLevel.waves[currentWaveIndex];

    if (currentWave && this.enemySpawnIndex < currentWave.enemies.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const enemyConfig = currentWave.enemies[this.enemySpawnIndex];
        this.state.monsters.push({
          id: `monster-${this.nextMonsterId++}`,
          hp: enemyConfig.hp,
          maxHp: enemyConfig.hp,
          progress: 0,
          speed: enemyConfig.speed,
          type: enemyConfig.type,
          escapeDamage: enemyConfig.escapeDamage
        });
        this.enemySpawnIndex += 1;
        this.spawnTimer = currentWave.spawnIntervalMs / 1000;
      }
    }

    // 3. Rotate hero weapons
    for (const hero of this.state.heroes) {
      hero.angle = (hero.angle + GameBalance.SWORD.ANGULAR_SPEED * dt) % (Math.PI * 2);
    }

    // 4. Move monsters along path
    for (const monster of this.state.monsters) {
      monster.progress += monster.speed * dt;
    }

    // 5. Combat: Hit detection between heroes' swords and monsters
    const monstersToRemove = new Set<string>();

    for (const hero of this.state.heroes) {
      const heroCenter = this.getHeroCenter(hero);
      const atk = Math.max(1, 2 ** hero.tier);

      for (const monster of this.state.monsters) {
        if (monstersToRemove.has(monster.id)) continue;

        const monsterPos = getPositionOnPath(monster.progress, GameBalance.PATH.RECT);
        const pairKey = `${hero.id}:${monster.id}`;
        const onCooldown = (this.hitCooldowns.get(pairKey) ?? 0) > 0;

        if (!onCooldown) {
          const hit = isSwordHittingMonster(
            heroCenter,
            hero.angle,
            GameBalance.SWORD.OFFSET_START,
            GameBalance.SWORD.LENGTH,
            GameBalance.SWORD.HITBOX_RADIUS,
            monsterPos,
            monster.type === 'boss' ? GameBalance.MONSTER.BOSS_RADIUS : GameBalance.MONSTER.RADIUS
          );

          if (hit) {
            monster.hp = Math.max(0, monster.hp - atk);
            this.hitCooldowns.set(pairKey, GameBalance.SWORD.HIT_COOLDOWN_MS / 1000);

            this.state.damageNumbers.push({
              id: `dmg-${this.nextDamageId++}`,
              x: monsterPos.x,
              y: monsterPos.y - 12,
              amount: atk,
              life: 0.6,
              maxLife: 0.6
            });

            if (monster.hp <= 0) {
              monstersToRemove.add(monster.id);
              this.state.kills += 1;
            }
          }
        }
      }
    }

    // 6. Combat: Hit detection between heroes' swords and eggs (orbit damage!)
    for (const hero of this.state.heroes) {
      const heroCenter = this.getHeroCenter(hero);

      for (const egg of this.state.eggs) {
        if (egg.status === 'pending' || egg.readyToHatch) continue;

        const eggPairKey = `${hero.id}:${egg.id}`;
        if (this.lastEggHitTick.get(eggPairKey) === this.currentTick) continue;

        const eggCenter = { x: egg.x, y: egg.y };
        const isEggHit = isSwordHittingEgg(
          heroCenter,
          hero.angle,
          GameBalance.SWORD.OFFSET_START,
          GameBalance.SWORD.LENGTH,
          GameBalance.SWORD.HITBOX_RADIUS,
          eggCenter,
          egg.radiusX,
          egg.radiusY
        );

        if (isEggHit) {
          this.applyEggDamage(hero, egg.id, 'orbit');
        }
      }
    }

    // 7. Check monsters escaping (completing perimeter)
    for (const monster of this.state.monsters) {
      if (monstersToRemove.has(monster.id)) continue;

      if (monster.progress >= perimeter) {
        monstersToRemove.add(monster.id);
        this.state.baseHp = Math.max(0, this.state.baseHp - (monster.escapeDamage ?? 1));

        if (this.state.baseHp <= 0) {
          this.state.isGameOver = true;
          this.state.notification = {
            text: 'GAME OVER — Căn cứ thất thủ!',
            color: '#ef4444',
            life: 10
          };
        }
      }
    }

    // Remove dead/escaped monsters
    if (monstersToRemove.size > 0) {
      this.state.monsters = this.state.monsters.filter((m) => !monstersToRemove.has(m.id));
      for (const mId of monstersToRemove) {
        for (const key of this.hitCooldowns.keys()) {
          if (key.endsWith(`:${mId}`)) {
            this.hitCooldowns.delete(key);
          }
        }
      }
    }

    // 8. Wave Progression / Victory Check
    const waveComplete = currentWave
      ? this.enemySpawnIndex >= currentWave.enemies.length && this.state.monsters.length === 0
      : this.state.monsters.length === 0;

    if (waveComplete) {
      if (this.state.wave >= this.currentLevel.waves.length) {
        if (this.state.baseHp > 0 && !this.state.isVictory) {
          this.state.isVictory = true;
          this.state.notification = {
            text: 'LEVEL COMPLETE! Bạn đã qua màn!',
            color: '#10b981',
            life: 10
          };
        }
      } else {
        this.interWaveTimer -= dt;
        if (this.interWaveTimer <= 0) {
          this.state.wave += 1;
          this.enemySpawnIndex = 0;
          this.spawnTimer = 0.5; // Brief 0.5s pause before first monster of new wave
          this.interWaveTimer = 2.0;
          this.state.notification = {
            text: `WAVE ${this.state.wave} Bắt đầu!`,
            color: '#38bdf8',
            life: 2.0
          };
        }
      }
    }

    // 9. Update floating damage numbers
    this.state.damageNumbers = this.state.damageNumbers.filter((dmg) => {
      dmg.life -= dt;
      dmg.y -= 25 * dt;
      return dmg.life > 0;
    });

    // 10. Update notification life
    if (this.state.notification) {
      this.state.notification.life -= dt;
      if (this.state.notification.life <= 0) {
        this.state.notification = undefined;
      }
    }
  }
}
