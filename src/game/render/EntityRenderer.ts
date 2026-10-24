import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import type { GameState } from '../domain/GameState';
import type { Hero, Monster, DamageNumber, Point } from '../domain/types';
import { getPositionOnPath } from '../domain/PathMath';
import { getSwordSegment } from '../domain/HitDetection';

export class EntityRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private debugGraphics: Phaser.GameObjects.Graphics;

  // Text pools / caches for labels
  private heroTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private monsterTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private damageTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.debugGraphics = scene.add.graphics();
  }

  public render(state: GameState, debug: boolean = false): void {
    this.graphics.clear();
    this.debugGraphics.clear();

    this.renderHeroes(state.heroes, debug);
    this.renderMonsters(state.monsters, debug);
    this.renderDamageNumbers(state.damageNumbers);
  }

  private getHeroCenter(hero: Hero): Point {
    return {
      x: GameBalance.BOARD.X + (hero.col + 0.5) * GameBalance.BOARD.CELL_SIZE,
      y: GameBalance.BOARD.Y + (hero.row + 0.5) * GameBalance.BOARD.CELL_SIZE
    };
  }

  private renderHeroes(heroes: Hero[], debug: boolean): void {
    const activeIds = new Set<string>();

    for (const hero of heroes) {
      activeIds.add(hero.id);
      const center = this.getHeroCenter(hero);
      const size = GameBalance.HERO.SIZE;
      const color = hero.kind === 'A' ? GameBalance.HERO.COLORS.A : GameBalance.HERO.COLORS.B;

      // 1. Draw Hero square
      this.graphics.fillStyle(color, 1.0);
      this.graphics.fillRoundedRect(
        center.x - size / 2,
        center.y - size / 2,
        size,
        size,
        6
      );

      this.graphics.lineStyle(2, 0xffffff, 0.9);
      this.graphics.strokeRoundedRect(
        center.x - size / 2,
        center.y - size / 2,
        size,
        size,
        6
      );

      // Hero label (Kind & ATK)
      const atk = Math.max(1, 2 ** hero.tier);
      let text = this.heroTexts.get(hero.id);
      if (!text) {
        text = this.scene.add.text(center.x, center.y, '', {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);
        this.heroTexts.set(hero.id, text);
      }
      text.setPosition(center.x, center.y);
      text.setText(`${hero.kind} ${atk}`);
      text.setVisible(true);

      // 2. Draw Rotating Sword
      const cos = Math.cos(hero.angle);
      const sin = Math.sin(hero.angle);
      const startX = center.x + GameBalance.SWORD.OFFSET_START * cos;
      const startY = center.y + GameBalance.SWORD.OFFSET_START * sin;
      const endX = center.x + (GameBalance.SWORD.OFFSET_START + GameBalance.SWORD.LENGTH) * cos;
      const endY = center.y + (GameBalance.SWORD.OFFSET_START + GameBalance.SWORD.LENGTH) * sin;

      // Sword blade
      this.graphics.lineStyle(GameBalance.SWORD.WIDTH, GameBalance.SWORD.COLOR, 1.0);
      this.graphics.lineBetween(startX, startY, endX, endY);

      // Sword tip highlight
      this.graphics.fillStyle(0xffffff, 0.9);
      this.graphics.fillCircle(endX, endY, GameBalance.SWORD.WIDTH / 2);

      // Sword hilt crossbar
      const perpCos = -sin;
      const perpSin = cos;
      const hiltHalf = 6;
      this.graphics.lineStyle(3, 0x94a3b8, 1.0);
      this.graphics.lineBetween(
        startX - perpCos * hiltHalf,
        startY - perpSin * hiltHalf,
        startX + perpCos * hiltHalf,
        startY + perpSin * hiltHalf
      );

      // 3. Debug Sword Hitbox
      if (debug) {
        const seg = getSwordSegment(
          center,
          hero.angle,
          GameBalance.SWORD.OFFSET_START,
          GameBalance.SWORD.LENGTH
        );

        // Draw centerline
        this.debugGraphics.lineStyle(1, 0x38bdf8, 0.9);
        this.debugGraphics.lineBetween(seg.start.x, seg.start.y, seg.end.x, seg.end.y);

        // Draw collision capsule circles at ends
        this.debugGraphics.lineStyle(1, 0x38bdf8, 0.5);
        this.debugGraphics.strokeCircle(seg.start.x, seg.start.y, GameBalance.SWORD.HITBOX_RADIUS);
        this.debugGraphics.strokeCircle(seg.end.x, seg.end.y, GameBalance.SWORD.HITBOX_RADIUS);
      }
    }

    // Cleanup removed hero texts
    for (const [id, text] of this.heroTexts.entries()) {
      if (!activeIds.has(id)) {
        text.destroy();
        this.heroTexts.delete(id);
      }
    }
  }

  private renderMonsters(monsters: Monster[], debug: boolean): void {
    const activeIds = new Set<string>();

    for (const monster of monsters) {
      activeIds.add(monster.id);
      const pos = getPositionOnPath(monster.progress, GameBalance.PATH.RECT);
      const radius = GameBalance.MONSTER.RADIUS;

      // Draw Monster Circle
      this.graphics.fillStyle(GameBalance.MONSTER.COLOR, 1.0);
      this.graphics.fillCircle(pos.x, pos.y, radius);

      this.graphics.lineStyle(2, 0xffffff, 0.9);
      this.graphics.strokeCircle(pos.x, pos.y, radius);

      // Monster HP text inside circle
      let text = this.monsterTexts.get(monster.id);
      if (!text) {
        text = this.scene.add.text(pos.x, pos.y, '', {
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);
        this.monsterTexts.set(monster.id, text);
      }
      text.setPosition(pos.x, pos.y);
      text.setText(`${monster.hp}`);
      text.setVisible(true);

      // Debug monster hitbox
      if (debug) {
        this.debugGraphics.lineStyle(1, 0xf43f5e, 0.8);
        this.debugGraphics.strokeCircle(pos.x, pos.y, radius);
      }
    }

    // Cleanup removed monster texts
    for (const [id, text] of this.monsterTexts.entries()) {
      if (!activeIds.has(id)) {
        text.destroy();
        this.monsterTexts.delete(id);
      }
    }
  }

  private renderDamageNumbers(damages: DamageNumber[]): void {
    const activeIds = new Set<string>();

    for (const dmg of damages) {
      activeIds.add(dmg.id);
      const alpha = Math.max(0, Math.min(1, dmg.life / dmg.maxLife));

      let text = this.damageTexts.get(dmg.id);
      if (!text) {
        text = this.scene.add.text(dmg.x, dmg.y, '', {
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#facc15',
          stroke: '#000000',
          strokeThickness: 3,
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);
        this.damageTexts.set(dmg.id, text);
      }
      text.setPosition(dmg.x, dmg.y);
      text.setText(`-${dmg.amount}`);
      text.setAlpha(alpha);
      text.setVisible(true);
    }

    // Cleanup finished damage texts
    for (const [id, text] of this.damageTexts.entries()) {
      if (!activeIds.has(id)) {
        text.destroy();
        this.damageTexts.delete(id);
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.debugGraphics.destroy();
    for (const text of this.heroTexts.values()) text.destroy();
    for (const text of this.monsterTexts.values()) text.destroy();
    for (const text of this.damageTexts.values()) text.destroy();
    this.heroTexts.clear();
    this.monsterTexts.clear();
    this.damageTexts.clear();
  }
}
