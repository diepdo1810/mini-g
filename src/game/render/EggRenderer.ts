import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import type { Egg } from '../domain/types';

export class EggRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();

    const { CENTER_X, CENTER_Y, RADIUS_Y } = GameBalance.EGG;

    // Text in center of egg
    this.hpText = scene.add.text(CENTER_X, CENTER_Y, 'EGG HP 3/3', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Hint text below egg
    this.hintText = scene.add.text(CENTER_X, CENTER_Y + RADIUS_Y + 20, 'Kéo nhân vật vào trứng để đập', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }

  public render(egg: Egg, debug: boolean = false): void {
    this.graphics.clear();

    const { CENTER_X, CENTER_Y, RADIUS_X, RADIUS_Y, TOUCH_PADDING, COLOR } = GameBalance.EGG;

    // 1. Egg Body (Oval)
    // Fill
    const fillColor = egg.readyToHatch ? 0x22c55e : COLOR;
    this.graphics.fillStyle(fillColor, 0.9);
    this.graphics.fillEllipse(CENTER_X, CENTER_Y, RADIUS_X * 2, RADIUS_Y * 2);

    // Border
    this.graphics.lineStyle(3, 0xffffff, 0.95);
    this.graphics.strokeEllipse(CENTER_X, CENTER_Y, RADIUS_X * 2, RADIUS_Y * 2);

    // Inner subtle glow/pattern
    this.graphics.fillStyle(0xffffff, 0.2);
    this.graphics.fillEllipse(CENTER_X - 10, CENTER_Y - 14, RADIUS_X * 0.9, RADIUS_Y * 0.9);

    // 2. Debug touch bounds if active
    if (debug) {
      this.graphics.lineStyle(1, 0x10b981, 0.6);
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
      this.hintText.setText('Trứng đã vỡ (Sẵn sàng nở ở Phase 3)');
      this.hintText.setColor('#4ade80');
    } else {
      this.hpText.setText(`EGG HP ${egg.hp}/${egg.maxHp}`);
      this.hpText.setColor('#ffffff');
      this.hintText.setText('Kéo nhân vật vào trứng để đập');
      this.hintText.setColor('#94a3b8');
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.hpText.destroy();
    this.hintText.destroy();
  }
}
