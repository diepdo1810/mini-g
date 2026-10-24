import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import type { Egg } from '../domain/types';

export class EggRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private lastHp: number = -1;
  private flashLife: number = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();

    const { CENTER_X, CENTER_Y, RADIUS_Y } = GameBalance.EGG;

    this.hpText = scene.add.text(CENTER_X, CENTER_Y, 'EGG HP 3/3', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.hintText = scene.add.text(CENTER_X, CENTER_Y + RADIUS_Y + 16, 'Kéo hoặc đặt Hero hàng dưới để chém trứng', {
      fontSize: '11px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }

  public render(egg: Egg, debug: boolean = false): void {
    this.graphics.clear();

    const { CENTER_X, CENTER_Y, RADIUS_X, RADIUS_Y, TOUCH_PADDING, COLOR } = GameBalance.EGG;

    // Detect damage for flash effect
    if (this.lastHp !== -1 && egg.hp < this.lastHp) {
      this.flashLife = 0.15;
    }
    this.lastHp = egg.hp;

    if (this.flashLife > 0) {
      this.flashLife -= 1 / 60;
    }

    // 1. Egg Body (Oval)
    let fillColor = egg.readyToHatch ? 0x22c55e : COLOR;
    if (this.flashLife > 0) {
      fillColor = 0xffffff;
    }

    this.graphics.fillStyle(fillColor, 0.95);
    this.graphics.fillEllipse(CENTER_X, CENTER_Y, RADIUS_X * 2, RADIUS_Y * 2);

    this.graphics.lineStyle(2.5, 0xffffff, 0.95);
    this.graphics.strokeEllipse(CENTER_X, CENTER_Y, RADIUS_X * 2, RADIUS_Y * 2);

    // Subtle inner highlight
    this.graphics.fillStyle(0xffffff, 0.25);
    this.graphics.fillEllipse(CENTER_X - 6, CENTER_Y - 8, RADIUS_X * 0.7, RADIUS_Y * 0.7);

    // 2. Debug bounds (touch area and exact egg ellipse)
    if (debug) {
      this.graphics.lineStyle(1, 0x10b981, 0.7);
      this.graphics.strokeEllipse(
        CENTER_X,
        CENTER_Y,
        (RADIUS_X + TOUCH_PADDING) * 2,
        (RADIUS_Y + TOUCH_PADDING) * 2
      );
    }

    // 3. Update Texts
    if (egg.readyToHatch) {
      this.hpText.setText('READY TO HATCH!');
      this.hpText.setColor('#ffffff');
      this.hintText.setText('Trứng đã vỡ (Sẵn sàng nở)');
      this.hintText.setColor('#4ade80');
    } else {
      this.hpText.setText(`EGG HP ${egg.hp}/${egg.maxHp}`);
      this.hpText.setColor('#ffffff');
      this.hintText.setText('Kéo hoặc Hero hàng dưới chém trứng');
      this.hintText.setColor('#94a3b8');
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.hpText.destroy();
    this.hintText.destroy();
  }
}
