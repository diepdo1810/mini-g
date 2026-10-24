import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import { getCampaignController } from '../campaign/campaignInstance';
import { getLevelConfig } from '../config/levels';

interface NodePos {
  x: number;
  y: number;
}

const NODE_POSITIONS: Record<number, NodePos> = {
  1: { x: 140, y: 140 },
  2: { x: 310, y: 195 },
  3: { x: 310, y: 265 },
  4: { x: 140, y: 325 },
  5: { x: 225, y: 395 }, // BOSS
  6: { x: 310, y: 465 },
  7: { x: 310, y: 535 },
  8: { x: 140, y: 595 },
  9: { x: 140, y: 665 },
  10: { x: 225, y: 730 } // FINAL BOSS
};

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene', active: true });
  }

  public async create(): Promise<void> {
    const controller = getCampaignController();
    await controller.init();

    const progress = controller.getProgress();
    const totalStars = controller.getTotalStars();
    const highestUnlocked = progress.highestUnlockedLevel;

    // Background
    this.add.rectangle(
      GameBalance.SCREEN.WIDTH / 2,
      GameBalance.SCREEN.HEIGHT / 2,
      GameBalance.SCREEN.WIDTH,
      GameBalance.SCREEN.HEIGHT,
      0x0f172a
    );

    // Header container
    this.add.text(GameBalance.SCREEN.WIDTH / 2, 35, 'CAMPAIGN MAP', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.add.text(
      GameBalance.SCREEN.WIDTH / 2,
      68,
      `★ ${totalStars} / 30 STARS`,
      {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'sans-serif'
      }
    ).setOrigin(0.5);

    // Draw connecting paths between level nodes
    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(4, 0x334155, 0.7);

    for (let i = 1; i < 10; i++) {
      const from = NODE_POSITIONS[i];
      const to = NODE_POSITIONS[i + 1];
      if (from && to) {
        pathGraphics.beginPath();
        pathGraphics.moveTo(from.x, from.y);
        pathGraphics.lineTo(to.x, to.y);
        pathGraphics.strokePath();
      }
    }

    // Highlight path for unlocked levels
    const unlockedPath = this.add.graphics();
    unlockedPath.lineStyle(4, 0x3b82f6, 0.9);
    for (let i = 1; i < highestUnlocked; i++) {
      const from = NODE_POSITIONS[i];
      const to = NODE_POSITIONS[i + 1];
      if (from && to) {
        unlockedPath.beginPath();
        unlockedPath.moveTo(from.x, from.y);
        unlockedPath.lineTo(to.x, to.y);
        unlockedPath.strokePath();
      }
    }

    // Render 10 level nodes
    for (let lvl = 1; lvl <= 10; lvl++) {
      this.renderLevelNode(lvl, progress, controller.canPlayLevel(lvl));
    }
  }

  private renderLevelNode(
    levelId: number,
    progress: ReturnType<typeof getCampaignController> extends { getProgress(): infer P } ? P : never,
    isUnlocked: boolean
  ): void {
    const pos = NODE_POSITIONS[levelId];
    if (!pos) return;

    const levelConfig = getLevelConfig(levelId);
    const result = progress.results[levelId];
    const isCompleted = (result?.bestStars ?? 0) > 0;
    const isBoss = levelConfig.isBossLevel;

    const radius = 24;

    // Node container
    const container = this.add.container(pos.x, pos.y);

    // Outer glow / halo for highest unlocked level
    if (levelId === progress.highestUnlockedLevel) {
      const glow = this.add.circle(0, 0, radius + 6, 0xfacc15, 0.35);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.5 },
        scale: { from: 0.95, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      container.add(glow);
    }

    // Main circle background
    const circle = this.add.circle(
      0,
      0,
      radius,
      isCompleted ? 0x059669 : isUnlocked ? 0x2563eb : 0x1e293b
    );
    circle.setStrokeStyle(3, isBoss ? 0xef4444 : isUnlocked ? 0x60a5fa : 0x475569);
    container.add(circle);

    // Label inside node: level number or lock
    if (isUnlocked) {
      const label = this.add.text(0, -1, `${levelId}`, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      container.add(label);
    } else {
      const lockIcon = this.add.text(0, -1, '🔒', {
        fontSize: '14px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      container.add(lockIcon);
    }

    // Stars display underneath completed node
    if (isCompleted && result) {
      const starsCount = result.bestStars;
      const starsStr = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
      const starsText = this.add.text(0, radius + 11, starsStr, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      container.add(starsText);
    }

    // Boss badge
    if (isBoss) {
      const bossBg = this.add.rectangle(0, -radius - 10, 36, 14, 0xef4444);
      const bossText = this.add.text(0, -radius - 10, 'BOSS', {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
      container.add(bossBg);
      container.add(bossText);
    }

    // Interactivity
    if (isUnlocked) {
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => {
        this.scene.start('GameScene', { levelId });
      });
      circle.on('pointerover', () => {
        circle.setScale(1.1);
      });
      circle.on('pointerout', () => {
        circle.setScale(1.0);
      });
    }
  }
}
