import { GameBalance } from '../config/GameBalance';
import { createInitialState, type GameState } from './GameState';
import type { GameAction } from './GameActions';
import type { Point, Hero, HeroKind } from './types';
import { getPerimeter, getPositionOnPath } from './PathMath';
import { isSwordHittingMonster, isSwordHittingEgg } from './HitDetection';
import { DefaultRandomSource, type RandomSource } from './RandomSource';

export class GameEngine {
  private state: GameState;
  private hitCooldowns: Map<string, number> = new Map();
  private eggOrbitCooldowns: Map<string, number> = new Map();
  private eggDragCooldowns: Map<string, number> = new Map();
  private lastEggHitTick: Map<string, number> = new Map();
  private currentTick = 0;
  private randomSource: RandomSource;

  private nextHeroId = 2;
  private nextEggId = 1;
  private nextDamageId = 1;
  private nextMonsterId = 2;

  // Wave Scheduler State
  private monstersSpawnedThisWave: number = 1;
  private spawnTimer: number = GameBalance.WAVES.SPAWN_INTERVAL;
  private interWaveTimer: number = GameBalance.WAVES.INTER_WAVE_DELAY;

  constructor(initialState?: GameState, randomSource?: RandomSource) {
    this.state = initialState ?? createInitialState();
    this.randomSource = randomSource ?? new DefaultRandomSource();
  }

  public getState(): GameState {
    return this.state;
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

  public applyEggDamage(hero: Hero, source: 'orbit' | 'drag'): boolean {
    if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return false;
    if (this.state.egg.readyToHatch) return false;

    const eggPairKey = `${hero.id}:${this.state.egg.id}`;

    // Deduplicate if both orbit and drag happen in the same simulation tick
    if (this.lastEggHitTick.get(eggPairKey) === this.currentTick) return false;

    if (source === 'drag') {
      const cd = this.eggDragCooldowns.get(eggPairKey) ?? 0;
      if (cd > 0) return false;
      this.eggDragCooldowns.set(eggPairKey, GameBalance.EGG.DRAG_COOLDOWN_MS / 1000);
      // Suppress immediate orbit hit to prevent double hit
      this.eggOrbitCooldowns.set(
        eggPairKey,
        Math.max(this.eggOrbitCooldowns.get(eggPairKey) ?? 0, GameBalance.EGG.DRAG_COOLDOWN_MS / 1000)
      );
    } else {
      const cd = this.eggOrbitCooldowns.get(eggPairKey) ?? 0;
      if (cd > 0) return false;
      this.eggOrbitCooldowns.set(eggPairKey, GameBalance.EGG.ORBIT_COOLDOWN_MS / 1000);
    }

    this.lastEggHitTick.set(eggPairKey, this.currentTick);

    const atk = Math.max(1, 2 ** hero.tier);
    this.state.egg.hp = Math.max(0, this.state.egg.hp - atk);

    // Spawn floating damage on egg
    this.state.damageNumbers.push({
      id: `dmg-${this.nextDamageId++}`,
      x: GameBalance.EGG.CENTER_X,
      y: GameBalance.EGG.CENTER_Y - 20,
      amount: atk,
      life: 0.6,
      maxLife: 0.6
    });

    if (this.state.egg.hp === 0) {
      this.state.egg.readyToHatch = true;
      this.tryHatchEgg();
    }

    return true;
  }

  public tryHatchEgg(): boolean {
    if (!this.state.egg.readyToHatch) return false;

    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) {
      this.state.notification = {
        text: 'Bàn cờ đầy — hãy ghép nhân vật!',
        color: '#f59e0b',
        life: 2.0
      };
      return false;
    }

    let cell: { row: number; col: number };
    let kind: HeroKind = 'A';

    if (this.state.egg.hatchCount === 0) {
      // First hatch: prioritized spawn at (row=4, col=2) so player immediately sees weapon hitting egg!
      const targetCell = emptyCells.find((c) => c.row === 4 && c.col === 2);
      if (targetCell) {
        cell = targetCell;
      } else {
        const bottomRowCell = emptyCells.find((c) => c.row === 4);
        cell = bottomRowCell ?? this.randomSource.choose(emptyCells);
      }
      kind = 'A';
    } else {
      cell = this.randomSource.choose(emptyCells);
      kind = this.randomSource.next() < 0.5 ? 'A' : 'B';
    }

    const newHero: Hero = {
      id: `hero-${this.nextHeroId++}`,
      kind,
      row: cell.row,
      col: cell.col,
      tier: 0,
      angle: 0
    };

    this.state.heroes.push(newHero);
    this.state.egg.hatchCount += 1;

    // Reset egg with increased HP and new ID
    const nextMaxHp = GameBalance.EGG.INITIAL_HP + GameBalance.EGG.HP_STEP * this.state.egg.hatchCount;
    const oldEggId = this.state.egg.id;
    this.nextEggId += 1;
    this.state.egg.id = `egg-${this.nextEggId}`;
    this.state.egg.maxHp = nextMaxHp;
    this.state.egg.hp = nextMaxHp;
    this.state.egg.readyToHatch = false;

    // Clean up cooldowns for old egg
    for (const key of this.eggOrbitCooldowns.keys()) {
      if (key.endsWith(`:${oldEggId}`)) this.eggOrbitCooldowns.delete(key);
    }
    for (const key of this.eggDragCooldowns.keys()) {
      if (key.endsWith(`:${oldEggId}`)) this.eggDragCooldowns.delete(key);
    }
    for (const key of this.lastEggHitTick.keys()) {
      if (key.endsWith(`:${oldEggId}`)) this.lastEggHitTick.delete(key);
    }

    this.state.notification = {
      text: `+Hero ${kind} (ATK 1)`,
      color: kind === 'A' ? '#38bdf8' : '#34d399',
      life: 2.0
    };

    return true;
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
        this.state = createInitialState();
        this.hitCooldowns.clear();
        this.eggOrbitCooldowns.clear();
        this.eggDragCooldowns.clear();
        this.lastEggHitTick.clear();
        this.currentTick = 0;
        this.nextDamageId = 1;
        this.nextHeroId = 2;
        this.nextEggId = 1;
        this.nextMonsterId = 2;
        this.monstersSpawnedThisWave = 1;
        this.spawnTimer = GameBalance.WAVES.SPAWN_INTERVAL;
        this.interWaveTimer = GameBalance.WAVES.INTER_WAVE_DELAY;
        break;

      case 'ATTACK_EGG': {
        const hero = this.state.heroes.find((h) => h.id === action.heroId);
        if (hero) {
          this.applyEggDamage(hero, 'drag');
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

    // 2. Wave Scheduler: Spawn monsters within current wave
    const currentWaveIndex = Math.min(this.state.wave - 1, GameBalance.WAVES.CONFIGS.length - 1);
    const currentWaveConfig = GameBalance.WAVES.CONFIGS[currentWaveIndex];

    if (this.monstersSpawnedThisWave < currentWaveConfig.monsterCount) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.state.monsters.push({
          id: `monster-${this.nextMonsterId++}`,
          hp: currentWaveConfig.monsterHp,
          maxHp: currentWaveConfig.monsterHp,
          progress: 0,
          speed: currentWaveConfig.monsterSpeed
        });
        this.monstersSpawnedThisWave += 1;
        this.spawnTimer = GameBalance.WAVES.SPAWN_INTERVAL;
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

    // 5. Combat: Hit detection between heroes' swords and monsters (purely monster damage!)
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
            GameBalance.MONSTER.RADIUS
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

    // 6. Combat: Hit detection between heroes' swords and egg (orbit damage!)
    const eggCenter = { x: GameBalance.EGG.CENTER_X, y: GameBalance.EGG.CENTER_Y };
    for (const hero of this.state.heroes) {
      const eggPairKey = `${hero.id}:${this.state.egg.id}`;
      if (this.lastEggHitTick.get(eggPairKey) === this.currentTick) continue;

      const heroCenter = this.getHeroCenter(hero);
      const isEggHit = isSwordHittingEgg(
        heroCenter,
        hero.angle,
        GameBalance.SWORD.OFFSET_START,
        GameBalance.SWORD.LENGTH,
        GameBalance.SWORD.HITBOX_RADIUS,
        eggCenter,
        GameBalance.EGG.RADIUS_X,
        GameBalance.EGG.RADIUS_Y
      );

      if (isEggHit) {
        this.applyEggDamage(hero, 'orbit');
      }
    }

    // 7. Check monsters escaping (completing perimeter)
    for (const monster of this.state.monsters) {
      if (monstersToRemove.has(monster.id)) continue;

      if (monster.progress >= perimeter) {
        monstersToRemove.add(monster.id);
        this.state.baseHp = Math.max(0, this.state.baseHp - 1);

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
    if (
      this.monstersSpawnedThisWave >= currentWaveConfig.monsterCount &&
      this.state.monsters.length === 0
    ) {
      if (this.state.wave >= GameBalance.WAVES.TOTAL) {
        if (this.state.baseHp > 0 && !this.state.isVictory) {
          this.state.isVictory = true;
          this.state.notification = {
            text: 'VICTORY! Bạn đã hoàn thành 5 wave!',
            color: '#10b981',
            life: 10
          };
        }
      } else {
        this.interWaveTimer -= dt;
        if (this.interWaveTimer <= 0) {
          this.state.wave += 1;
          this.monstersSpawnedThisWave = 0;
          this.spawnTimer = 0.5; // Brief 0.5s pause before first monster of new wave
          this.interWaveTimer = GameBalance.WAVES.INTER_WAVE_DELAY;
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
