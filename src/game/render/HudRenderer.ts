import Phaser from 'phaser';
import type { GameState } from '../domain/GameState';
import { GameBalance } from '../config/GameBalance';

export interface HudCallbacks {
  onTogglePause: () => void;
  onToggleDebug: () => void;
  onRestart: () => void;
  onGoToMap: () => void;
  onNextLevel?: () => void;
}

export class HudRenderer {
  private scene: Phaser.Scene;
  private callbacks: HudCallbacks;
  private mapBtnHeader: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private baseHpText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private pauseBtn: Phaser.GameObjects.Text;
  private debugBtn: Phaser.GameObjects.Text;
  private notificationText: Phaser.GameObjects.Text;

  private overlayBg?: Phaser.GameObjects.Rectangle;
  private bannerText?: Phaser.GameObjects.Text;
  private starsText?: Phaser.GameObjects.Text;
  private statsText?: Phaser.GameObjects.Text;
  private campaignCompleteText?: Phaser.GameObjects.Text;
  private restartBtn?: Phaser.GameObjects.Text;
  private mapBtnOverlay?: Phaser.GameObjects.Text;
  private nextBtn?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, callbacks: HudCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Header Line 1: < MAP, LVL X, WAVE X/Y, PAUSE
    this.mapBtnHeader = scene.add.text(16, 20, '< MAP', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onGoToMap);

    this.levelText = scene.add.text(82, 22, 'LVL 1', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#38bdf8',
      fontFamily: 'sans-serif'
    });

    this.waveText = scene.add.text(142, 22, 'WAVE 1/3', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    });

    // Pause button
    this.pauseBtn = scene.add.text(360, 20, 'PAUSE', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#334155',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onTogglePause);

    // Header Line 2: Base HP, Kills, DBG
    this.baseHpText = scene.add.text(16, 52, 'Base HP: 3/3', {
      fontSize: '14px',
      color: '#ef4444',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.killsText = scene.add.text(160, 52, 'Kills: 0', {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    });

    // Debug toggle button
    this.debugBtn = scene.add.text(360, 52, 'DBG: OFF', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#94a3b8',
      backgroundColor: '#1e293b',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onToggleDebug);

    // Dynamic notification banner
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
    this.levelText.setText(`LVL ${state.currentLevelId}`);
    this.waveText.setText(`WAVE ${state.wave}/${state.totalWaves}`);
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
          0.85
        );

        this.bannerText = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          270,
          state.isVictory ? 'LEVEL COMPLETE!' : 'DEFEAT',
          {
            fontSize: '30px',
            fontStyle: 'bold',
            color: state.isVictory ? '#10b981' : '#ef4444',
            fontFamily: 'sans-serif'
          }
        ).setOrigin(0.5);

        // Stars display
        const earnedStars = state.isVictory ? (state.baseHp >= 3 ? 3 : state.baseHp === 2 ? 2 : 1) : 0;
        const starsStr = state.isVictory
          ? '★'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars)
          : '☆☆☆';

        this.starsText = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          320,
          starsStr,
          {
            fontSize: '32px',
            fontStyle: 'bold',
            color: state.isVictory ? '#facc15' : '#64748b',
            fontFamily: 'sans-serif'
          }
        ).setOrigin(0.5);

        this.statsText = this.scene.add.text(
          GameBalance.SCREEN.WIDTH / 2,
          370,
          `Base HP: ${state.baseHp}/${state.maxBaseHp}   •   Kills: ${state.kills}`,
          {
            fontSize: '15px',
            color: '#cbd5e1',
            fontFamily: 'sans-serif'
          }
        ).setOrigin(0.5);

        const isLastLevel = state.currentLevelId >= 10;

        if (state.isVictory && isLastLevel) {
          this.campaignCompleteText = this.scene.add.text(
            GameBalance.SCREEN.WIDTH / 2,
            415,
            '🎉 CAMPAIGN COMPLETE! 🎉\nBạn đã phá đảo 10 màn chơi!',
            {
              fontSize: '15px',
              fontStyle: 'bold',
              align: 'center',
              color: '#38bdf8',
              fontFamily: 'sans-serif'
            }
          ).setOrigin(0.5);
        }

        // Action buttons layout
        if (state.isVictory && !isLastLevel) {
          // 3 buttons: Retry, Map, Next Level
          this.restartBtn = this.scene.add.text(105, 460, 'RETRY', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#2563eb',
            padding: { left: 14, right: 14, top: 8, bottom: 8 },
            fontFamily: 'sans-serif'
          })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', onRestart);

          this.mapBtnOverlay = this.scene.add.text(220, 460, 'MAP', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#334155',
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            fontFamily: 'sans-serif'
          })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', this.callbacks.onGoToMap);

          this.nextBtn = this.scene.add.text(340, 460, 'NEXT >', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#10b981',
            padding: { left: 14, right: 14, top: 8, bottom: 8 },
            fontFamily: 'sans-serif'
          })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.callbacks.onNextLevel?.());
        } else {
          // 2 buttons: Retry, Map
          this.restartBtn = this.scene.add.text(160, 460, 'RETRY', {
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#2563eb',
            padding: { left: 18, right: 18, top: 9, bottom: 9 },
            fontFamily: 'sans-serif'
          })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', onRestart);

          this.mapBtnOverlay = this.scene.add.text(290, 460, 'MAP', {
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#334155',
            padding: { left: 20, right: 20, top: 9, bottom: 9 },
            fontFamily: 'sans-serif'
          })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', this.callbacks.onGoToMap);
        }
      }
    } else {
      if (this.overlayBg) {
        this.clearOverlay();
      }
    }
  }

  private clearOverlay(): void {
    this.overlayBg?.destroy();
    this.bannerText?.destroy();
    this.starsText?.destroy();
    this.statsText?.destroy();
    this.campaignCompleteText?.destroy();
    this.restartBtn?.destroy();
    this.mapBtnOverlay?.destroy();
    this.nextBtn?.destroy();

    this.overlayBg = undefined;
    this.bannerText = undefined;
    this.starsText = undefined;
    this.statsText = undefined;
    this.campaignCompleteText = undefined;
    this.restartBtn = undefined;
    this.mapBtnOverlay = undefined;
    this.nextBtn = undefined;
  }

  public destroy(): void {
    this.mapBtnHeader.destroy();
    this.levelText.destroy();
    this.waveText.destroy();
    this.baseHpText.destroy();
    this.killsText.destroy();
    this.pauseBtn.destroy();
    this.debugBtn.destroy();
    this.notificationText.destroy();
    this.clearOverlay();
  }
}
