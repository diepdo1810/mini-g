import { GameBalance } from '../config/GameBalance';
import { createInitialState, type GameState } from './GameState';
import type { GameAction } from './GameActions';
import type { Point, Hero } from './types';
import { getPerimeter, getPositionOnPath } from './PathMath';
import { isSwordHittingMonster } from './HitDetection';

export class GameEngine {
  private state: GameState;
  private hitCooldowns: Map<string, number> = new Map();
  private eggCooldowns: Map<string, number> = new Map();
  private nextDamageId = 1;

  constructor(initialState?: GameState) {
    this.state = initialState ?? createInitialState();
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

        if (this.state.egg.hp === 0) {
          this.state.egg.readyToHatch = true;
        }

        // Floating damage number on egg
        this.state.damageNumbers.push({
          id: `dmg-${this.nextDamageId++}`,
          x: GameBalance.EGG.CENTER_X,
          y: GameBalance.EGG.CENTER_Y - 24,
          amount: atk,
          life: 0.6,
          maxLife: 0.6
        });
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

    // Clamp delta to prevent huge jumps on tab lag
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
            // Apply damage
            monster.hp = Math.max(0, monster.hp - atk);
            this.hitCooldowns.set(pairKey, GameBalance.SWORD.HIT_COOLDOWN_MS / 1000);

            // Spawn floating damage number
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
      // Cleanup cooldowns for removed monsters
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
  }
}

