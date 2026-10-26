import Phaser from 'phaser';
import type { GameState } from '../domain/GameState';
import { GameBalance } from '../config/GameBalance';

export interface HudCallbacks {
  onTogglePause: () => void;
  onToggleDebug: () => void;
  onRestart: () => void;
  onGoToMap: () => void;
  onNextLevel?: () => void;
  onClaimHero?: () => void;
  onToggleAutoReceive?: () => void;
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

  // New HUD elements for Issue #25
  private interWaveBanner: Phaser.GameObjects.Text;
  private queueTitleText: Phaser.GameObjects.Text;
  private queueBadgeTexts: Phaser.GameObjects.Text[] = [];
  private queueOverflowText: Phaser.GameObjects.Text;
  private claimHeroBtn: Phaser.GameObjects.Text;
  private autoReceiveBtn: Phaser.GameObjects.Text;
  private mapTouchTarget: Phaser.GameObjects.Rectangle;
  private pauseTouchTarget: Phaser.GameObjects.Rectangle;
  private claimTouchTarget: Phaser.GameObjects.Rectangle;
  private autoTouchTarget: Phaser.GameObjects.Rectangle;

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
    this.mapBtnHeader = scene.add.text(16, 18, '< MAP', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
      fontFamily: 'sans-serif'
    });

    this.levelText = scene.add.text(88, 22, 'LVL 1', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#38bdf8',
      fontFamily: 'sans-serif'
    });

    this.waveText = scene.add.text(148, 22, 'WAVE 1/3', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    });

    // Pause button
    this.pauseBtn = scene.add.text(352, 18, 'PAUSE', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#334155',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
      fontFamily: 'sans-serif'
    });

    // Header Line 2: Base HP, Kills, DBG
    this.baseHpText = scene.add.text(16, 54, 'Base HP: 3/3', {
      fontSize: '14px',
      color: '#ef4444',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.killsText = scene.add.text(160, 54, 'Kills: 0', {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    });

    // Debug toggle button
    this.debugBtn = scene.add.text(352, 76, 'DBG: OFF', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#94a3b8',
      backgroundColor: '#1e293b',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      fontFamily: 'sans-serif'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callbacks.onToggleDebug);

    // Inter-wave countdown banner (above board)
    this.interWaveBanner = scene.add.text(GameBalance.SCREEN.WIDTH / 2, 110, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#facc15',
      backgroundColor: '#1e293b',
      padding: { left: 14, right: 14, top: 6, bottom: 6 },
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    this.interWaveBanner.setVisible(false);

    // Dynamic notification banner
    this.notificationText = scene.add.text(GameBalance.SCREEN.WIDTH / 2, 595, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Queue title text
    this.queueTitleText = scene.add.text(20, 638, 'HÀNG CHỜ: (0)', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    });

    // 3 Visible Queue Badges
    for (let i = 0; i < 3; i++) {
      const badge = scene.add.text(20 + i * 42, 660, '', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1e293b',
        padding: { left: 6, right: 6, top: 4, bottom: 4 },
        fontFamily: 'sans-serif'
      });
      badge.setVisible(false);
      this.queueBadgeTexts.push(badge);
    }

    // Overflow badge for queue > 3 (+N)
    this.queueOverflowText = scene.add.text(20 + 3 * 42, 660, '+1', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#facc15',
      backgroundColor: '#78350f',
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
      fontFamily: 'sans-serif'
    });
    this.queueOverflowText.setVisible(false);

    // Claim Hero Button
    this.claimHeroBtn = scene.add.text(320, 655, 'NHẬN HERO', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#16a34a',
      padding: { left: 14, right: 14, top: 8, bottom: 8 },
      fontFamily: 'sans-serif'
    })
      .setOrigin(0.5, 0);

    // Auto Receive Toggle Button
    this.autoReceiveBtn = scene.add.text(320, 727, 'TỰ ĐỘNG: TẮT', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#cbd5e1',
      backgroundColor: '#334155',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
      fontFamily: 'sans-serif'
    })
      .setOrigin(0.5, 0);

    // Transparent hit areas are independent from font/label size.
    // All interactive buttons meet 44 CSS px height at 360x640 in Phaser FIT.
    const hit = GameBalance.HUD.TOUCH_TARGETS;
    const touchHeight = GameBalance.HUD.MIN_TOUCH_TARGET_PX;
    const createTouchTarget = (
      target: { x: number; y: number; width: number },
      callback: () => void
    ): Phaser.GameObjects.Rectangle =>
      scene.add.rectangle(target.x, target.y, target.width, touchHeight, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback);
    this.mapTouchTarget = createTouchTarget(hit.MAP, callbacks.onGoToMap);
    this.pauseTouchTarget = createTouchTarget(hit.PAUSE, callbacks.onTogglePause);
    this.claimTouchTarget = createTouchTarget(hit.CLAIM, () => {
      if (this.canClaimHero) this.callbacks.onClaimHero?.();
    });
    this.autoTouchTarget = createTouchTarget(hit.AUTO, () => {
      if (this.canToggleAuto) this.callbacks.onToggleAutoReceive?.();
    });
  }

  private canClaimHero = false;
  private canToggleAuto = true;

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

    // Inter-wave countdown banner
    if (state.interWaveCountdown !== undefined && !state.isGameOver && !state.isVictory) {
      this.interWaveBanner.setText(`⏳ CHUẨN BỊ WAVE ${state.wave + 1}: ${state.interWaveCountdown.toFixed(1)}s`);
      this.interWaveBanner.setVisible(true);
    } else {
      this.interWaveBanner.setVisible(false);
    }

    // Hatch Queue HUD
    const queue = state.hatchQueue ?? [];
    this.queueTitleText.setText(`HÀNG CHỜ: (${queue.length})`);

    // Render up to 3 queue items
    for (let i = 0; i < 3; i++) {
      const badge = this.queueBadgeTexts[i];
      if (i < queue.length) {
        const item = queue[i];
        badge.setText(`${item.reward.kind}${2 ** item.reward.heroTier}`);
        if (item.reward.kind === 'A') {
          badge.setBackgroundColor('#1e3a8a');
          badge.setColor('#38bdf8');
        } else {
          badge.setBackgroundColor('#064e3b');
          badge.setColor('#34d399');
        }
        badge.setVisible(true);
      } else {
        badge.setVisible(false);
      }
    }

    // Overflow badge (+N)
    if (queue.length > 3) {
      this.queueOverflowText.setText(`+${queue.length - 3}`);
      this.queueOverflowText.setVisible(true);
    } else {
      this.queueOverflowText.setVisible(false);
    }

    // Claim Hero Button state
    const isCooldown = state.hatchCooldownRemaining > 0;
    const isQueueEmpty = queue.length === 0;
    const isBoardFull = state.heroes.length >= 25;
    const isBlocked = state.isPaused || state.isGameOver || state.isVictory;
    this.canClaimHero = !isBlocked && !isCooldown && !isQueueEmpty && !isBoardFull;
    this.canToggleAuto = !isBlocked;

    if (isBlocked) {
      this.claimHeroBtn.setText('NHẬN HERO');
      this.claimHeroBtn.setBackgroundColor('#1e293b');
      this.claimHeroBtn.setColor('#475569');
    } else if (isCooldown) {
      this.claimHeroBtn.setText(`NHẬN (${state.hatchCooldownRemaining.toFixed(1)}s)`);
      this.claimHeroBtn.setBackgroundColor('#334155');
      this.claimHeroBtn.setColor('#94a3b8');
    } else if (isBoardFull) {
      this.claimHeroBtn.setText('BÀN ĐẦY');
      this.claimHeroBtn.setBackgroundColor('#78350f');
      this.claimHeroBtn.setColor('#fde68a');
    } else if (isQueueEmpty) {
      this.claimHeroBtn.setText('NHẬN HERO');
      this.claimHeroBtn.setBackgroundColor('#1e293b');
      this.claimHeroBtn.setColor('#64748b');
    } else {
      this.claimHeroBtn.setText('NHẬN HERO');
      this.claimHeroBtn.setBackgroundColor('#16a34a');
      this.claimHeroBtn.setColor('#ffffff');
    }

    // Auto Receive Button state
    if (state.autoReceiveHatch) {
      this.autoReceiveBtn.setText('TỰ ĐỘNG: BẬT');
      this.autoReceiveBtn.setBackgroundColor('#059669');
      this.autoReceiveBtn.setColor('#ecfdf5');
    } else {
      this.autoReceiveBtn.setText('TỰ ĐỘNG: TẮT');
      this.autoReceiveBtn.setBackgroundColor('#334155');
      this.autoReceiveBtn.setColor('#cbd5e1');
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
    this.interWaveBanner.destroy();
    this.queueTitleText.destroy();
    for (const b of this.queueBadgeTexts) b.destroy();
    this.queueOverflowText.destroy();
    this.claimHeroBtn.destroy();
    this.autoReceiveBtn.destroy();
    this.mapTouchTarget.destroy();
    this.pauseTouchTarget.destroy();
    this.claimTouchTarget.destroy();
    this.autoTouchTarget.destroy();
    this.clearOverlay();
  }
}
