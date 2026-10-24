import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import { GameEngine } from '../domain/GameEngine';
import type { Hero, Point } from '../domain/types';
import { isPointInEggArea } from '../domain/EggMath';

export class DragController {
  private scene: Phaser.Scene;
  private engine: GameEngine;
  private graphics: Phaser.GameObjects.Graphics;

  private activeHero: Hero | null = null;
  private startPoint: Point | null = null;
  private currentPoint: Point = { x: 0, y: 0 };
  private isDragging: boolean = false;

  constructor(scene: Phaser.Scene, engine: GameEngine) {
    this.scene = scene;
    this.engine = engine;
    this.graphics = scene.add.graphics();

    this.setupListeners();
  }

  private setupListeners(): void {
    const input = this.scene.input;

    input.on('pointerdown', this.onPointerDown, this);
    input.on('pointermove', this.onPointerMove, this);
    input.on('pointerup', this.onPointerUp, this);
    input.on('pointerupoutside', this.cancelDrag, this);
    input.on('gameout', this.cancelDrag, this);

    this.scene.game.events.on(Phaser.Core.Events.BLUR, this.cancelDrag, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activeHero) return; // Only one drag at a time
    if (this.engine.getState().isPaused || this.engine.getState().isGameOver) return;

    const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;

    // Check if clicked inside board
    const col = Math.floor((pointer.x - X) / CELL_SIZE);
    const row = Math.floor((pointer.y - Y) / CELL_SIZE);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
      return;
    }

    const hero = this.engine.getState().heroes.find((h) => h.row === row && h.col === col);
    if (hero) {
      this.activeHero = hero;
      this.startPoint = { x: pointer.x, y: pointer.y };
      this.currentPoint = { x: pointer.x, y: pointer.y };
      this.isDragging = false;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.activeHero || !this.startPoint) return;

    this.currentPoint = { x: pointer.x, y: pointer.y };

    const dx = this.currentPoint.x - this.startPoint.x;
    const dy = this.currentPoint.y - this.startPoint.y;
    const distSq = dx * dx + dy * dy;

    if (!this.isDragging && distSq >= GameBalance.DRAG.MIN_DISTANCE * GameBalance.DRAG.MIN_DISTANCE) {
      this.isDragging = true;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && this.activeHero) {
      // 1. Target is Egg
      if (isPointInEggArea(pointer.x, pointer.y)) {
        this.engine.dispatch({ type: 'ATTACK_EGG', heroId: this.activeHero.id });
      } else {
        // 2. Target on Board
        const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;
        const col = Math.floor((pointer.x - X) / CELL_SIZE);
        const row = Math.floor((pointer.y - Y) / CELL_SIZE);

        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          const targetHero = this.engine.getState().heroes.find(
            (h) => h.row === row && h.col === col
          );

          if (!targetHero) {
            // Target is an empty cell -> MOVE
            this.engine.dispatch({
              type: 'MOVE_HERO',
              heroId: this.activeHero.id,
              targetRow: row,
              targetCol: col
            });
          } else if (targetHero.id !== this.activeHero.id) {
            // Target is another hero -> MERGE
            this.engine.dispatch({
              type: 'MERGE_HERO',
              sourceId: this.activeHero.id,
              targetId: targetHero.id
            });
          }
        }
      }
    }

    this.cancelDrag();
  }

  public cancelDrag(): void {
    this.activeHero = null;
    this.startPoint = null;
    this.isDragging = false;
    this.graphics.clear();
  }

  public render(): void {
    this.graphics.clear();

    if (!this.isDragging || !this.activeHero) return;

    const heroCenter = this.engine.getHeroCenter(this.activeHero);
    const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;

    // Check hovered cell for hover highlight
    const hoverCol = Math.floor((this.currentPoint.x - X) / CELL_SIZE);
    const hoverRow = Math.floor((this.currentPoint.y - Y) / CELL_SIZE);

    if (hoverCol >= 0 && hoverCol < COLS && hoverRow >= 0 && hoverRow < ROWS) {
      const cellX = X + hoverCol * CELL_SIZE;
      const cellY = Y + hoverRow * CELL_SIZE;
      const hoverHero = this.engine.getState().heroes.find(
        (h) => h.row === hoverRow && h.col === hoverCol
      );

      if (!hoverHero) {
        // Highlight empty cell green
        this.graphics.lineStyle(2, 0x10b981, 0.9);
        this.graphics.strokeRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (hoverHero.id !== this.activeHero.id) {
        const canMerge =
          hoverHero.kind === this.activeHero.kind && hoverHero.tier === this.activeHero.tier;
        // Highlight compatible merge golden yellow, mismatch red
        this.graphics.lineStyle(2, canMerge ? 0xfacc15 : 0xef4444, 0.9);
        this.graphics.strokeRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    // 1. Draw connecting line from hero center to pointer
    this.graphics.lineStyle(2, GameBalance.DRAG.LINE_COLOR, 0.8);
    this.graphics.lineBetween(
      heroCenter.x,
      heroCenter.y,
      this.currentPoint.x,
      this.currentPoint.y
    );

    // 2. Draw drag ghost at pointer
    const size = GameBalance.HERO.SIZE;
    const color =
      this.activeHero.kind === 'A' ? GameBalance.HERO.COLORS.A : GameBalance.HERO.COLORS.B;

    this.graphics.fillStyle(color, GameBalance.DRAG.GHOST_ALPHA);
    this.graphics.fillRoundedRect(
      this.currentPoint.x - size / 2,
      this.currentPoint.y - size / 2,
      size,
      size,
      6
    );

    this.graphics.lineStyle(2, 0xffffff, 0.7);
    this.graphics.strokeRoundedRect(
      this.currentPoint.x - size / 2,
      this.currentPoint.y - size / 2,
      size,
      size,
      6
    );
  }

  public destroy(): void {
    const input = this.scene.input;
    input.off('pointerdown', this.onPointerDown, this);
    input.off('pointermove', this.onPointerMove, this);
    input.off('pointerup', this.onPointerUp, this);
    input.off('pointerupoutside', this.cancelDrag, this);
    input.off('gameout', this.cancelDrag, this);

    this.graphics.destroy();
  }
}
