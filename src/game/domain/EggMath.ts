import { GameBalance } from '../config/GameBalance';

export function isPointInEggArea(x: number, y: number): boolean {
  const { CENTER_X, CENTER_Y, RADIUS_X, RADIUS_Y, TOUCH_PADDING } = GameBalance.EGG;
  const rx = RADIUS_X + TOUCH_PADDING;
  const ry = RADIUS_Y + TOUCH_PADDING;

  const dx = x - CENTER_X;
  const dy = y - CENTER_Y;

  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}
