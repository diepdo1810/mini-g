import Phaser from 'phaser';
import { MapScene } from './game/scenes/MapScene';
import { GameScene } from './game/scenes/GameScene';
import { GameBalance } from './game/config/GameBalance';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GameBalance.SCREEN.WIDTH,
  height: GameBalance.SCREEN.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#12131a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    preserveDrawingBuffer: true
  },
  scene: [MapScene, GameScene]
};

window.addEventListener('DOMContentLoaded', () => {
  const game = new Phaser.Game(config);
  (window as unknown as { __PHASER_GAME__: Phaser.Game }).__PHASER_GAME__ = game;
});
