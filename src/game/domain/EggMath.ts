import { GameBalance } from '../config/GameBalance';

export function isPointInEgg(
  x: number,
  y: number,
  eggX: number,
  eggY: number,
  radiusX: number,
  radiusY: number,
  padding: number = GameBalance.EGG.TOUCH_PADDING
): boolean {
  const rx = radiusX + padding;
  const ry = radiusY + padding;
  const dx = x - eggX;
  const dy = y - eggY;

  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

export function isPointInEggArea(x: number, y: number): boolean {
  return isPointInEgg(
    x,
    y,
    GameBalance.EGG.CENTER_X,
    GameBalance.EGG.CENTER_Y,
    GameBalance.EGG.RADIUS_X,
    GameBalance.EGG.RADIUS_Y
  );
}
