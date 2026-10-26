import Phaser from 'phaser';
import { GameEngine } from '../domain/GameEngine';
import { BoardRenderer } from '../render/BoardRenderer';
import { EntityRenderer } from '../render/EntityRenderer';
import { EggRenderer } from '../render/EggRenderer';
import { HudRenderer } from '../render/HudRenderer';
import { DragController } from '../input/DragController';
import { getLevelConfig } from '../config/levels';
import { getCampaignController } from '../campaign/campaignInstance';

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private boardRenderer!: BoardRenderer;
  private entityRenderer!: EntityRenderer;
  private eggRenderer!: EggRenderer;
  private hudRenderer!: HudRenderer;
  private dragController!: DragController;
  private debugMode: boolean = false;
  private levelId: number = 1;
  private hasRecordedResult: boolean = false;

  constructor() {
    super({ key: 'GameScene', active: false });
  }

  public init(data?: { levelId?: number }): void {
    this.levelId = data?.levelId ?? 1;
    this.hasRecordedResult = false;
  }

  public create(): void {
    const levelConfig = getLevelConfig(this.levelId);
    const highestEggLevel = getCampaignController().getHighestUnlockedEggLevel();
    this.engine = new GameEngine(undefined, undefined, levelConfig, highestEggLevel);

    this.boardRenderer = new BoardRenderer(this);
    this.entityRenderer = new EntityRenderer(this);
    this.eggRenderer = new EggRenderer(this);
    this.dragController = new DragController(this, this.engine);

    this.hudRenderer = new HudRenderer(this, {
      onTogglePause: () => this.togglePause(),
      onToggleDebug: () => this.toggleDebug(),
      onRestart: () => this.restart(),
      onGoToMap: () => this.goToMap(),
      onNextLevel: () => this.goToNextLevel()
    });

    // Keyboard controls
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-D', () => this.toggleDebug());
      this.input.keyboard.on('keydown-P', () => this.togglePause());
      this.input.keyboard.on('keydown-R', () => this.restart());
    }

    // Auto-pause when browser tab loses focus / game is hidden
    this.game.events.on(Phaser.Core.Events.BLUR, this.onGameBlur, this);

    // Cleanup on scene shutdown or destroy
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.on(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    // Initial board background render
    this.boardRenderer.render(this.debugMode);
  }

  private onGameBlur(): void {
    this.dragController.cancelDrag();
    this.dragController.clearSelection();
    this.engine.dispatch({ type: 'PAUSE' });
  }

  private cleanup(): void {
    this.game.events.off(Phaser.Core.Events.BLUR, this.onGameBlur, this);
    this.boardRenderer.destroy();
    this.entityRenderer.destroy();
    this.eggRenderer.destroy();
    this.hudRenderer.destroy();
    this.dragController.destroy();
  }

  private togglePause(): void {
    const isPaused = this.engine.getState().isPaused;
    this.engine.dispatch({ type: isPaused ? 'RESUME' : 'PAUSE' });
    this.dragController.clearSelection();
  }

  private toggleDebug(): void {
    this.debugMode = !this.debugMode;
    this.boardRenderer.render(this.debugMode);
  }

  private restart(): void {
    this.hasRecordedResult = false;
    this.engine.dispatch({ type: 'RESTART' });
    this.dragController.cancelDrag();
    this.dragController.clearSelection();
    this.boardRenderer.render(this.debugMode);
  }

  private goToMap(): void {
    this.dragController.clearSelection();
    this.scene.start('MapScene');
  }

  private goToNextLevel(): void {
    if (this.levelId < 10) {
      this.scene.start('GameScene', { levelId: this.levelId + 1 });
    } else {
      this.goToMap();
    }
  }

  public override update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.engine.tick(deltaSeconds);

    const state = this.engine.getState();

    // Record victory result once
    if (state.isVictory && !this.hasRecordedResult) {
      this.hasRecordedResult = true;
      const controller = getCampaignController();
      controller.recordLevelResult(this.levelId, state.baseHp, state.kills).catch((err) => {
        console.error('Failed to record level result:', err);
      });
    }

    this.entityRenderer.render(state, this.debugMode);
    this.eggRenderer.render(state.eggs, this.debugMode);
    this.dragController.render();
    this.hudRenderer.render(state, this.debugMode, () => this.restart());
  }
}
