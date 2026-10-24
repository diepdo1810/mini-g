import Phaser from 'phaser';
import type { GameState } from '../domain/GameState';
import { GameBalance } from '../config/GameBalance';

export interface HudCallbacks {
  onTogglePause: () => void;
  onToggleDebug: () => void;
  onRestart: () => void;
}

export class HudRenderer {
  private scene: Phaser.Scene;
  private waveText: Phaser.GameObjects.Text;
  private baseHpText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private pauseBtn: Phaser.GameObjects.Text;
  private debugBtn: Phaser.GameObjects.Text;
  private notificationText: Phaser.GameObjects.Text;

  private overlayBg?: Phaser.GameObjects.Rectangle;
  private bannerText?: Phaser.GameObjects.Text;
  private statsText?: Phaser.GameObjects.Text;
  private restartBtn?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, callbacks: HudCallbacks) {
    this.scene = scene;

    // Header HUD
    this.waveText = scene.add.text(24, 24, 'WAVE 1/5', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    });

    this.baseHpText = scene.add.text(24, 52, 'Base HP: 3/3', {
      fontSize: '15px',
      color: '#ef4444',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.killsText = scene.add.text(170, 52, 'Kills: 0', {
      fontSize: '15px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    });

    // Pause button
    this.pauseBtn = scene.add.text(350, 24, 'PAUSE', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#334155',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onTogglePause);

    // Debug toggle button
    this.debugBtn = scene.add.text(350, 56, 'DBG: OFF', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#94a3b8',
      backgroundColor: '#1e293b',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onToggleDebug);

    // Dynamic notification banner (Hatch / Merge / Wave transition / Warning)
    this.notificationText = scene.add.text(GameBalance.SCREEN.WIDTH / 2, 600, '', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }

  public render(state: GameState, debug: boolean, onRestart: () => void): void {
    this.waveText.setText(`WAVE ${state.wave}/5`);
    this.baseHpText.setText(`Base HP: ${state.baseHp}/${state.maxBaseHp}`);
    this.killsText.setText(`Kills: ${state.kills}`);
    this.pauseBtn.setText(state.isPaused ? 'RESUME' : 'PAUSE');
    this.debugBtn.setText(debug ? 'DBG: ON' : 'DBG: OFF');
    this.debugBtn.setColor(debug ? '#10b981' : '#94a3b8');

    // Render active notification
    if (state.notification) {
      this.notificationText.setText(state.notification.text);
      this.notificationText.setColor(state.notification.color);
      this.notificationText.setVisible(true);
      const alpha = Math.min(1, state.notification.life / 0.5);
      this.notificationText.setAlpha(alpha);
    } else {
      this.notificationText.setVisible(false);
    }

    // Handle Game Over / Victory overlay
    if (state.isGameOver || state.isVictory) {
      if (!this.overlayBg) {
        this.overlayBg = this.scene.add.rectangle(
          GameBalance.SCREEN.WIDTH / 2,
          GameBalance.SCREEN.HEIGHT / 2,
          GameBalance.SCREEN.WIDTH,
          GameBalance.SCREEN.HEIGHT,
          0x000000,
          0.8
        );

        this.bannerText = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          GameBalance.SCREEN.HEIGHT / 2 - 60,
          state.isVictory ? 'VICTORY!' : 'GAME OVER',
          {
            fontSize: '32px',
            fontStyle: 'bold',
            color: state.isVictory ? '#10b981' : '#ef4444',
            fontFamily: 'sans-serif'
          }
        ).setOrigin(0.5);

        this.statsText = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          GameBalance.SCREEN.HEIGHT / 2 - 10,
          `Kills: ${state.kills}   •   Wave: ${state.wave}/5`,
          {
            fontSize: '15px',
            color: '#cbd5e1',
            fontFamily: 'sans-serif'
          }
        ).setOrigin(0.5);

        this.restartBtn = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          GameBalance.SCREEN.HEIGHT / 2 + 50,
          'RESTART',
          {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#2563eb',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
            fontFamily: 'sans-serif'
          }
        )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', onRestart);
      }
    } else {
      if (this.overlayBg) {
        this.overlayBg.destroy();
        this.bannerText?.destroy();
        this.statsText?.destroy();
        this.restartBtn?.destroy();
        this.overlayBg = undefined;
        this.bannerText = undefined;
        this.statsText = undefined;
        this.restartBtn = undefined;
      }
    }
  }

  public destroy(): void {
    this.waveText.destroy();
    this.baseHpText.destroy();
    this.killsText.destroy();
    this.pauseBtn.destroy();
    this.debugBtn.destroy();
    this.notificationText.destroy();
    this.overlayBg?.destroy();
    this.bannerText?.destroy();
    this.statsText?.destroy();
    this.restartBtn?.destroy();
  }
}
