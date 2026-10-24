import Phaser from 'phaser';
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
  scene: [GameScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
