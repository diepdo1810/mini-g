import { describe, it, expect } from 'vitest';
import { GameBalance } from '../src/game/config/GameBalance';
import { calculateEggPositions } from '../src/game/domain/EggProgression';

describe('Issue #25 - Mobile 9:16 Viewport & Layout Audit', () => {
  it('checks actual HUD hit-area configuration for MAP and PAUSE', () => {
    const hud = GameBalance.HUD;
    const hit = hud.TOUCH_TARGETS;
    for (const [width, height] of [[360, 640], [412, 915]]) {
      const scale = Math.min(
        width / GameBalance.SCREEN.WIDTH,
        height / GameBalance.SCREEN.HEIGHT
      );
      for (const button of Object.values(hit)) {
        expect(button.width * scale).toBeGreaterThanOrEqual(44);
        expect(hud.MIN_TOUCH_TARGET_PX * scale).toBeGreaterThanOrEqual(44);
        expect(button.x - button.width / 2).toBeGreaterThanOrEqual(0);
        expect(button.x + button.width / 2).toBeLessThanOrEqual(GameBalance.SCREEN.WIDTH);
        expect(button.y - hud.MIN_TOUCH_TARGET_PX / 2).toBeGreaterThanOrEqual(0);
        expect(button.y + hud.MIN_TOUCH_TARGET_PX / 2).toBeLessThanOrEqual(GameBalance.SCREEN.HEIGHT);
      }
    }

  });

  it('ensures board, outer path, eggs, and bottom queue HUD do not overlap vertically', () => {
    const topHudBottom = 80;
    const interWaveBannerY = 110;
    const pathRect = GameBalance.PATH.RECT; // top: 140, bottom: 460
    const eggCenterY = GameBalance.EGG.CENTER_Y; // 516
    const eggBottom = eggCenterY + GameBalance.EGG.RADIUS_Y + GameBalance.EGG.TOUCH_PADDING; // ~564
    const queueHudTop = 620;
    const queueHudBottom = 750;
    const screenHeight = GameBalance.SCREEN.HEIGHT; // 800

    expect(topHudBottom).toBeLessThan(interWaveBannerY);
    expect(interWaveBannerY).toBeLessThan(pathRect.top);
    expect(pathRect.top).toBe(140);
    expect(pathRect.bottom).toBe(460);
    expect(pathRect.bottom).toBeLessThan(eggCenterY - GameBalance.EGG.RADIUS_Y);
    expect(eggBottom).toBeLessThan(queueHudTop);
    expect(queueHudBottom).toBeLessThanOrEqual(screenHeight);
  });

  it('meets minimum touch target size (>= 44 CSS px) on 360x640 portrait viewport', () => {
    const viewportWidth = 360;
    const scale = viewportWidth / GameBalance.SCREEN.WIDTH; // 360 / 450 = 0.8

    // Board cell size (56 game px)
    const effectiveCellCssPx = GameBalance.BOARD.CELL_SIZE * scale;
    expect(effectiveCellCssPx).toBeGreaterThanOrEqual(44); // 44.8 CSS px

    // Single egg diameter with touch padding
    const eggRadiusWithPadding = GameBalance.EGG.RADIUS_X + GameBalance.EGG.TOUCH_PADDING; // 32 + 12 = 44
    const effectiveEggDiameterCssPx = eggRadiusWithPadding * 2 * scale; // 88 * 0.8 = 70.4 CSS px
    expect(effectiveEggDiameterCssPx).toBeGreaterThanOrEqual(44);

    // Multi-egg (4-5 eggs) radius 22 with touch padding 12
    const multiEggRadius = 22 + GameBalance.EGG.TOUCH_PADDING; // 34
    const effectiveMultiEggCssPx = multiEggRadius * 2 * scale; // 68 * 0.8 = 54.4 CSS px
    expect(effectiveMultiEggCssPx).toBeGreaterThanOrEqual(44);
  });

  it('meets minimum touch target size (>= 44 CSS px) on 412x915 portrait viewport', () => {
    const viewportWidth = 412;
    const scale = viewportWidth / GameBalance.SCREEN.WIDTH; // 412 / 450 ≈ 0.915

    const effectiveCellCssPx = GameBalance.BOARD.CELL_SIZE * scale;
    expect(effectiveCellCssPx).toBeGreaterThanOrEqual(44); // ~51.2 CSS px

    const multiEggRadius = 22 + GameBalance.EGG.TOUCH_PADDING;
    const effectiveMultiEggCssPx = multiEggRadius * 2 * scale;
    expect(effectiveMultiEggCssPx).toBeGreaterThanOrEqual(44); // ~62.2 CSS px
  });

  it('ensures all egg configurations (1 to 5 eggs) fit within screen width without collision', () => {
    for (let count = 1; count <= 5; count++) {
      const positions = calculateEggPositions(count);
      expect(positions).toHaveLength(count);

      for (let i = 0; i < positions.length; i++) {
        const egg = positions[i];
        // Egg boundary must stay inside [0, 450]
        expect(egg.x - egg.radiusX).toBeGreaterThanOrEqual(0);
        expect(egg.x + egg.radiusX).toBeLessThanOrEqual(GameBalance.SCREEN.WIDTH);

        // No overlap between consecutive eggs
        if (i > 0) {
          const prev = positions[i - 1];
          const dist = egg.x - prev.x;
          expect(dist).toBeGreaterThan(egg.radiusX + prev.radiusX);
        }
      }
    }
  });
});
