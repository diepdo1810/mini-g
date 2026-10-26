import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import type { Egg } from '../domain/types';

const EGG_LEVEL_COLORS: Record<number, number> = {
  1: 0xf59e0b, // Amber gold
  2: 0x8b5cf6, // Purple
  3: 0xec4899, // Pink / Magenta
  4: 0x06b6d4  // Cyan (future)
};

export class EggRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private hpTexts: Phaser.GameObjects.Text[] = [];
  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private hintText: Phaser.GameObjects.Text;
  private lastHpMap: Map<string, number> = new Map();
  private flashLifeMap: Map<string, number> = new Map();

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();

    // Pool of texts for up to 5 eggs
    for (let i = 0; i < 5; i++) {
      const hpText = scene.add.text(0, 0, '', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      hpText.setVisible(false);
      this.hpTexts.push(hpText);

      const badgeText = scene.add.text(0, 0, '', {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 2,
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      badgeText.setVisible(false);
      this.badgeTexts.push(badgeText);
    }

    this.hintText = scene.add.text(
      GameBalance.SCREEN.WIDTH / 2,
      562,
      'Kéo hoặc đặt Hero hàng dưới để chém trứng',
      {
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      }
    ).setOrigin(0.5);
  }

  public render(eggsOrEgg: Egg[] | Egg, debug: boolean = false): void {
    this.graphics.clear();

    const eggs = Array.isArray(eggsOrEgg) ? eggsOrEgg : [eggsOrEgg];

    // Decrement flash timers
    for (const [id, life] of this.flashLifeMap.entries()) {
      if (life > 0) {
        this.flashLifeMap.set(id, life - 1 / 60);
      } else {
        this.flashLifeMap.delete(id);
      }
    }

    // Render each egg
    eggs.forEach((egg, index) => {
      if (index >= 5) return;

      const x = egg.x ?? GameBalance.EGG.CENTER_X;
      const y = egg.y ?? GameBalance.EGG.CENTER_Y;
      const rx = egg.radiusX ?? GameBalance.EGG.RADIUS_X;
      const ry = egg.radiusY ?? GameBalance.EGG.RADIUS_Y;
      const eggLevel = egg.eggLevel ?? 1;

      // Detect damage for flash effect
      const lastHp = this.lastHpMap.get(egg.id);
      if (lastHp !== undefined && egg.hp < lastHp) {
        this.flashLifeMap.set(egg.id, 0.15);
      }
      this.lastHpMap.set(egg.id, egg.hp);

      const isFlashing = (this.flashLifeMap.get(egg.id) ?? 0) > 0;
      // 1. Egg Body
      const baseColor = EGG_LEVEL_COLORS[eggLevel] ?? 0xf59e0b;
      let fillColor = baseColor;
      if (isFlashing) {
        fillColor = 0xffffff;
      }

      this.graphics.fillStyle(fillColor, 0.95);
      this.graphics.fillEllipse(x, y, rx * 2, ry * 2);

      // Stroke
      const strokeColor = 0xffffff;
      this.graphics.lineStyle(2.5, strokeColor, 0.95);
      this.graphics.strokeEllipse(x, y, rx * 2, ry * 2);

      // Inner highlight
      this.graphics.fillStyle(0xffffff, 0.25);
      this.graphics.fillEllipse(x - rx * 0.2, y - ry * 0.25, rx * 0.7, ry * 0.7);

      // Debug touch boundary
      if (debug) {
        this.graphics.lineStyle(1, 0x10b981, 0.7);
        this.graphics.strokeEllipse(
          x,
          y,
          (rx + GameBalance.EGG.TOUCH_PADDING) * 2,
          (ry + GameBalance.EGG.TOUCH_PADDING) * 2
        );
      }

      // Texts
      const hpText = this.hpTexts[index];
      if (hpText) {
        hpText.setPosition(x, y);
        hpText.setVisible(true);

        hpText.setText(`${egg.hp}/${egg.maxHp}`);
        hpText.setColor('#ffffff');
      }

      // Egg level badge if > 1
      const badgeText = this.badgeTexts[index];
      if (badgeText) {
        if (eggLevel > 1) {
          badgeText.setPosition(x, y - ry - 8);
          badgeText.setText(`Lv.${eggLevel}`);
          badgeText.setVisible(true);
        } else {
          badgeText.setVisible(false);
        }
      }
    });

    // Hide unused texts
    for (let i = eggs.length; i < 5; i++) {
      this.hpTexts[i]?.setVisible(false);
      this.badgeTexts[i]?.setVisible(false);
    }

    // Eggs stay hittable: rewards incubate independently in the HUD queue.
    this.hintText.setText('Đập trứng liên tục · Hero tự ấp trong hàng chờ');
    this.hintText.setColor('#94a3b8');
  }

  public destroy(): void {
    this.graphics.destroy();
    for (const t of this.hpTexts) t.destroy();
    for (const t of this.badgeTexts) t.destroy();
    this.hintText.destroy();
  }
}
