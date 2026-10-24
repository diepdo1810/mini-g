import Phaser from 'phaser';
import { GameEngine } from '../domain/GameEngine';
import { BoardRenderer } from '../render/BoardRenderer';
import { EntityRenderer } from '../render/EntityRenderer';
import { EggRenderer } from '../render/EggRenderer';
import { HudRenderer } from '../render/HudRenderer';
import { DragController } from '../input/DragController';

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private boardRenderer!: BoardRenderer;
  private entityRenderer!: EntityRenderer;
  private eggRenderer!: EggRenderer;
  private hudRenderer!: HudRenderer;
  private dragController!: DragController;
  private debugMode: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.engine = new GameEngine();

    this.boardRenderer = new BoardRenderer(this);
    this.entityRenderer = new EntityRenderer(this);
    this.eggRenderer = new EggRenderer(this);
    this.dragController = new DragController(this, this.engine);

    this.hudRenderer = new HudRenderer(this, {
      onTogglePause: () => this.togglePause(),
      onToggleDebug: () => this.toggleDebug(),
      onRestart: () => this.restart()
    });

    // Keyboard controls
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-D', () => this.toggleDebug());
      this.input.keyboard.on('keydown-P', () => this.togglePause());
      this.input.keyboard.on('keydown-R', () => this.restart());
    }

    // Auto-pause when browser tab loses focus / game is hidden
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.engine.dispatch({ type: 'PAUSE' });
    });

    // Cleanup on scene shutdown or destroy
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.on(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    // Initial board background render
    this.boardRenderer.render(this.debugMode);
  }

  private cleanup(): void {
    this.boardRenderer.destroy();
    this.entityRenderer.destroy();
    this.eggRenderer.destroy();
    this.hudRenderer.destroy();
    this.dragController.destroy();
  }

  private togglePause(): void {
    const isPaused = this.engine.getState().isPaused;
    this.engine.dispatch({ type: isPaused ? 'RESUME' : 'PAUSE' });
  }

  private toggleDebug(): void {
    this.debugMode = !this.debugMode;
    this.boardRenderer.render(this.debugMode);
  }

  private restart(): void {
    this.engine.dispatch({ type: 'RESTART' });
    this.dragController.cancelDrag();
    this.boardRenderer.render(this.debugMode);
  }

  public override update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.engine.tick(deltaSeconds);

    const state = this.engine.getState();
    this.entityRenderer.render(state, this.debugMode);
    this.eggRenderer.render(state.egg, this.debugMode);
    this.dragController.render();
    this.hudRenderer.render(state, this.debugMode, () => this.restart());
  }

}
