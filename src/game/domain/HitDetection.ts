import type { Point } from './types';

export interface LineSegment {
  start: Point;
  end: Point;
}

export function distancePointToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    const px = point.x - a.x;
    const py = point.y - a.y;
    return Math.sqrt(px * px + py * py);
  }

  // Projection scalar t on segment AB
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  const distX = point.x - projX;
  const distY = point.y - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

export function getSwordSegment(
  heroCenter: Point,
  angle: number,
  offsetStart: number,
  length: number
): LineSegment {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    start: {
      x: heroCenter.x + offsetStart * cos,
      y: heroCenter.y + offsetStart * sin
    },
    end: {
      x: heroCenter.x + (offsetStart + length) * cos,
      y: heroCenter.y + (offsetStart + length) * sin
    }
  };
}

export function isSwordHittingMonster(
  heroCenter: Point,
  angle: number,
  offsetStart: number,
  length: number,
  swordHitboxRadius: number,
  monsterCenter: Point,
  monsterRadius: number
): boolean {
  const segment = getSwordSegment(heroCenter, angle, offsetStart, length);
  const dist = distancePointToSegment(monsterCenter, segment.start, segment.end);
  return dist <= swordHitboxRadius + monsterRadius;
}
