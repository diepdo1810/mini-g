import type { PathRect, Point } from './types';

export function getPerimeter(rect: PathRect): number {
  const w = rect.right - rect.left;
  const h = rect.bottom - rect.top;
  return 2 * (w + h);
}

export function getPositionOnPath(progress: number, rect: PathRect): Point {
  const w = rect.right - rect.left;
  const h = rect.bottom - rect.top;
  const perimeter = 2 * (w + h);

  if (perimeter <= 0) {
    return { x: rect.left, y: rect.top };
  }

  // Clamp progress within [0, perimeter]
  const clamped = Math.max(0, Math.min(progress, perimeter));

  // Segment 1: Top edge (left -> right)
  if (clamped <= w) {
    return {
      x: rect.left + clamped,
      y: rect.top
    };
  }

  // Segment 2: Right edge (top -> bottom)
  if (clamped <= w + h) {
    return {
      x: rect.right,
      y: rect.top + (clamped - w)
    };
  }

  // Segment 3: Bottom edge (right -> left)
  if (clamped <= 2 * w + h) {
    return {
      x: rect.right - (clamped - (w + h)),
      y: rect.bottom
    };
  }

  // Segment 4: Left edge (bottom -> top)
  return {
    x: rect.left,
    y: rect.bottom - (clamped - (2 * w + h))
  };
}

