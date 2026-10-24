import { GameBalance } from '../config/GameBalance';
import { createInitialState, type GameState } from './GameState';
import type { GameAction } from './GameActions';
import type { Point, Hero, HeroKind } from './types';
import { getPerimeter, getPositionOnPath } from './PathMath';
import { isSwordHittingMonster } from './HitDetection';
import { DefaultRandomSource, type RandomSource } from './RandomSource';

export class GameEngine {
  private state: GameState;
  private hitCooldowns: Map<string, number> = new Map();
  private eggCooldowns: Map<string, number> = new Map();
  private randomSource: RandomSource;
  private nextHeroId = 2;
  private nextDamageId = 1;

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

    const cell = this.randomSource.choose(emptyCells);
    let kind: HeroKind = 'A';
    if (this.state.egg.hatchCount > 0) {
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

    // Reset egg with increased HP
    const nextMaxHp = GameBalance.EGG.INITIAL_HP + GameBalance.EGG.HP_STEP * this.state.egg.hatchCount;
    this.state.egg.maxHp = nextMaxHp;
    this.state.egg.hp = nextMaxHp;
    this.state.egg.readyToHatch = false;

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
        this.eggCooldowns.clear();
        this.nextDamageId = 1;
        this.nextHeroId = 2;
        break;

      case 'ATTACK_EGG': {
        if (this.state.isPaused || this.state.isGameOver || this.state.isVictory) return;
        if (this.state.egg.readyToHatch) return;

        const hero = this.state.heroes.find((h) => h.id === action.heroId);
        if (!hero) return;

        const cooldown = this.eggCooldowns.get(hero.id) ?? 0;
        if (cooldown > 0) return;

        const atk = Math.max(1, 2 ** hero.tier);
        this.state.egg.hp = Math.max(0, this.state.egg.hp - atk);
        this.eggCooldowns.set(hero.id, GameBalance.EGG.ATTACK_COOLDOWN_MS / 1000);

        // Spawn floating damage on egg
        this.state.damageNumbers.push({
          id: `dmg-${this.nextDamageId++}`,
          x: GameBalance.EGG.CENTER_X,
          y: GameBalance.EGG.CENTER_Y - 24,
          amount: atk,
          life: 0.6,
          maxLife: 0.6
        });

        if (this.state.egg.hp === 0) {
          this.state.egg.readyToHatch = true;
          this.tryHatchEgg();
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

        // Ensure target cell is empty
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

          // Remove source hero
          this.state.heroes = this.state.heroes.filter((h) => h.id !== source.id);

          // Cleanup cooldowns for removed hero
          for (const key of this.hitCooldowns.keys()) {
            if (key.startsWith(`${source.id}:`)) {
              this.hitCooldowns.delete(key);
            }
          }
          this.eggCooldowns.delete(source.id);

          this.state.notification = {
            text: `MERGE ${target.kind} ${oldAtk} → ${newAtk}`,
            color: '#facc15',
            life: 2.0
          };

          // If egg was waiting to hatch due to full board, hatch now!
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

    for (const [heroId, remaining] of this.eggCooldowns.entries()) {
      const nextTime = remaining - dt;
      if (nextTime <= 0) {
        this.eggCooldowns.delete(heroId);
      } else {
        this.eggCooldowns.set(heroId, nextTime);
      }
    }

    // 2. Rotate hero weapons
    for (const hero of this.state.heroes) {
      hero.angle = (hero.angle + GameBalance.SWORD.ANGULAR_SPEED * dt) % (Math.PI * 2);
    }

    // 3. Move monsters along path
    for (const monster of this.state.monsters) {
      monster.progress += monster.speed * dt;
    }

    // 4. Combat: Hit detection between heroes' swords and monsters
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

    // 5. Check monsters escaping (completing perimeter)
    for (const monster of this.state.monsters) {
      if (monstersToRemove.has(monster.id)) continue;

      if (monster.progress >= perimeter) {
        monstersToRemove.add(monster.id);
        this.state.baseHp = Math.max(0, this.state.baseHp - 1);

        if (this.state.baseHp <= 0) {
          this.state.isGameOver = true;
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

    // 6. Update floating damage numbers
    this.state.damageNumbers = this.state.damageNumbers.filter((dmg) => {
      dmg.life -= dt;
      dmg.y -= 25 * dt;
      return dmg.life > 0;
    });

    // 7. Update notification life
    if (this.state.notification) {
      this.state.notification.life -= dt;
      if (this.state.notification.life <= 0) {
        this.state.notification = undefined;
      }
    }
  }
}
