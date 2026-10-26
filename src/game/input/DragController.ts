import Phaser from 'phaser';
import { GameBalance } from '../config/GameBalance';
import { GameEngine } from '../domain/GameEngine';
import type { Hero, Point } from '../domain/types';


export class DragController {
  private scene: Phaser.Scene;
  private engine: GameEngine;
  private graphics: Phaser.GameObjects.Graphics;

  private activeHero: Hero | null = null;
  private startPoint: Point | null = null;
  private currentPoint: Point = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private hasMovedPastTapThreshold: boolean = false;

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
    if (
      this.engine.getState().isPaused ||
      this.engine.getState().isGameOver ||
      this.engine.getState().isVictory
    ) {
      return;
    }

    const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;

    // Record start point for tap vs drag detection
    this.startPoint = { x: pointer.x, y: pointer.y };
    this.currentPoint = { x: pointer.x, y: pointer.y };
    this.isDragging = false;
    this.hasMovedPastTapThreshold = false;

    // Check if clicked inside board
    const col = Math.floor((pointer.x - X) / CELL_SIZE);
    const row = Math.floor((pointer.y - Y) / CELL_SIZE);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const hero = this.engine.getState().heroes.find((h) => h.row === row && h.col === col);
      this.activeHero = hero ?? null;
    } else {
      this.activeHero = null;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: pointer.x, y: pointer.y };

    const dx = this.currentPoint.x - this.startPoint.x;
    const dy = this.currentPoint.y - this.startPoint.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= GameBalance.DRAG.MIN_DISTANCE * GameBalance.DRAG.MIN_DISTANCE) {
      this.hasMovedPastTapThreshold = true;
      if (this.activeHero) {
        this.isDragging = true;
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (
      this.engine.getState().isPaused ||
      this.engine.getState().isGameOver ||
      this.engine.getState().isVictory
    ) {
      this.cancelDrag();
      return;
    }

    if (this.startPoint) {
      const dx = pointer.x - this.startPoint.x;
      const dy = pointer.y - this.startPoint.y;
      if (dx * dx + dy * dy >= GameBalance.DRAG.MIN_DISTANCE * GameBalance.DRAG.MIN_DISTANCE) {
        this.hasMovedPastTapThreshold = true;
      }
    }

    if (this.isDragging && this.activeHero) {
      // DRAG ACTION
      // 1. Target is an Egg
      const targetEgg = this.engine.getEggAtPoint(pointer.x, pointer.y);
      if (targetEgg) {
        this.engine.dispatch({
          type: 'ATTACK_EGG',
          heroId: this.activeHero.id,
          eggId: targetEgg.id
        });
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
      this.engine.selectHero(undefined);
    } else if (!this.hasMovedPastTapThreshold) {
      // TAP ACTION: Tap-to-select and Tap-to-merge
      const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;
      const col = Math.floor((pointer.x - X) / CELL_SIZE);
      const row = Math.floor((pointer.y - Y) / CELL_SIZE);
      const isInsideBoard = col >= 0 && col < COLS && row >= 0 && row < ROWS;

      const currentSelectedId = this.engine.getState().selectedHeroId;

      if (isInsideBoard) {
        const tappedHero = this.engine.getState().heroes.find(
          (h) => h.row === row && h.col === col
        );

        if (currentSelectedId) {
          const selectedHero = this.engine.getState().heroes.find(
            (h) => h.id === currentSelectedId
          );

          if (selectedHero) {
            if (tappedHero && tappedHero.id === selectedHero.id) {
              // Tapped selected hero again -> deselect
              this.engine.selectHero(undefined);
            } else if (
              tappedHero &&
              tappedHero.kind === selectedHero.kind &&
              tappedHero.tier === selectedHero.tier
            ) {
              // Tapped valid merge target -> merge selected into tapped
              this.engine.dispatch({
                type: 'MERGE_HERO',
                sourceId: selectedHero.id,
                targetId: tappedHero.id
              });
              this.engine.selectHero(undefined);
            } else {
              // Tapped empty cell or invalid hero -> deselect
              this.engine.selectHero(undefined);
            }
          } else {
            this.engine.selectHero(tappedHero ? tappedHero.id : undefined);
          }
        } else {
          // No hero currently selected -> select tapped hero
          if (tappedHero) {
            this.engine.selectHero(tappedHero.id);
          }
        }
      } else {
        // Tap outside board -> deselect
        if (currentSelectedId) {
          this.engine.selectHero(undefined);
        }
      }
    } else {
      // Gesture exceeded tap threshold but had no active hero to drag
      // Reject from tap-to-merge; clear selection if present
      if (this.engine.getState().selectedHeroId) {
        this.engine.selectHero(undefined);
      }
    }

    this.cancelDrag();
  }

  public cancelDrag(): void {
    this.activeHero = null;
    this.startPoint = null;
    this.isDragging = false;
    this.hasMovedPastTapThreshold = false;
    this.graphics.clear();
  }

  public clearSelection(): void {
    this.engine.selectHero(undefined);
  }

  public render(): void {
    this.graphics.clear();

    const { X, Y, CELL_SIZE, ROWS, COLS } = GameBalance.BOARD;

    // Render tap selection & merge candidate highlights when not dragging
    if (!this.isDragging) {
      const selectedHeroId = this.engine.getState().selectedHeroId;
      if (selectedHeroId) {
        const selectedHero = this.engine.getState().heroes.find(
          (h) => h.id === selectedHeroId
        );

        if (selectedHero) {
          const selCellX = X + selectedHero.col * CELL_SIZE;
          const selCellY = Y + selectedHero.row * CELL_SIZE;

          // 1. Highlight selected hero: prominent cyan/white border
          this.graphics.lineStyle(3, 0x38bdf8, 1.0);
          this.graphics.strokeRoundedRect(selCellX + 3, selCellY + 3, CELL_SIZE - 6, CELL_SIZE - 6, 8);
          this.graphics.lineStyle(1, 0xffffff, 0.8);
          this.graphics.strokeRoundedRect(selCellX + 5, selCellY + 5, CELL_SIZE - 10, CELL_SIZE - 10, 6);

          // 2. Highlight matching merge candidates with golden yellow border
          const candidates = this.engine.getState().heroes.filter(
            (h) =>
              h.id !== selectedHero.id &&
              h.kind === selectedHero.kind &&
              h.tier === selectedHero.tier
          );

          for (const candidate of candidates) {
            const candX = X + candidate.col * CELL_SIZE;
            const candY = Y + candidate.row * CELL_SIZE;

            this.graphics.lineStyle(2.5, 0xfacc15, 0.95);
            this.graphics.strokeRoundedRect(candX + 3, candY + 3, CELL_SIZE - 6, CELL_SIZE - 6, 8);
          }
        }
      }
      return;
    }

    if (!this.activeHero) return;

    const heroCenter = this.engine.getHeroCenter(this.activeHero);

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
