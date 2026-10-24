import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';

export class BoardRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  public render(debug: boolean = false): void {
    this.graphics.clear();

    const { ROWS, COLS, CELL_SIZE, X, Y } = GameBalance.BOARD;
    const pathRect = GameBalance.PATH.RECT;

    // 1. Draw outer monster path (dashed/semi-transparent boundary)
    this.graphics.lineStyle(2, 0x475569, 0.7);
    this.graphics.strokeRect(
      pathRect.left,
      pathRect.top,
      pathRect.right - pathRect.left,
      pathRect.bottom - pathRect.top
    );

    // Draw small corner markers on the path
    this.graphics.fillStyle(0x64748b, 0.8);
    const cornerSize = 6;
    this.graphics.fillRect(pathRect.left - cornerSize / 2, pathRect.top - cornerSize / 2, cornerSize, cornerSize);
    this.graphics.fillRect(pathRect.right - cornerSize / 2, pathRect.top - cornerSize / 2, cornerSize, cornerSize);
    this.graphics.fillRect(pathRect.right - cornerSize / 2, pathRect.bottom - cornerSize / 2, cornerSize, cornerSize);
    this.graphics.fillRect(pathRect.left - cornerSize / 2, pathRect.bottom - cornerSize / 2, cornerSize, cornerSize);

    // 2. Draw 5x5 Board background & grid cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellX = X + c * CELL_SIZE;
        const cellY = Y + r * CELL_SIZE;

        // Alternating subtle cell backgrounds
        const isAlt = (r + c) % 2 === 0;
        this.graphics.fillStyle(isAlt ? 0x1e293b : 0x0f172a, 0.9);
        this.graphics.fillRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Cell border
        this.graphics.lineStyle(1, 0x334155, 0.8);
        this.graphics.strokeRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    // 3. Debug visualization if active
    if (debug) {
      this.graphics.lineStyle(1, 0x10b981, 0.8);
      this.graphics.strokeRect(
        pathRect.left,
        pathRect.top,
        pathRect.right - pathRect.left,
        pathRect.bottom - pathRect.top
      );
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}

