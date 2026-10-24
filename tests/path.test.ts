import { describe, it, expect } from 'vitest';
import { getPerimeter, getPositionOnPath } from '../src/game/domain/PathMath';
import type { PathRect } from '../src/game/domain/types';

describe('PathMath', () => {
  const rect: PathRect = { left: 50, top: 100, right: 350, bottom: 400 };

  it('calculates perimeter correctly', () => {
    expect(getPerimeter(rect)).toBe(1200);
  });

  it('calculates 4 corners correctly', () => {
    // Top-left (start)
    expect(getPositionOnPath(0, rect)).toEqual({ x: 50, y: 100 });
    // Top-right corner
    expect(getPositionOnPath(300, rect)).toEqual({ x: 350, y: 100 });
    // Bottom-right corner
    expect(getPositionOnPath(600, rect)).toEqual({ x: 350, y: 400 });
    // Bottom-left corner
    expect(getPositionOnPath(900, rect)).toEqual({ x: 50, y: 400 });
    // End (full loop, back to top-left)
    expect(getPositionOnPath(1200, rect)).toEqual({ x: 50, y: 100 });
  });

  it('interpolates positions smoothly along segments', () => {
    // Halfway across top edge
    expect(getPositionOnPath(150, rect)).toEqual({ x: 200, y: 100 });
    // Halfway down right edge
    expect(getPositionOnPath(450, rect)).toEqual({ x: 350, y: 250 });
    // Halfway across bottom edge
    expect(getPositionOnPath(750, rect)).toEqual({ x: 200, y: 400 });
    // Halfway up left edge
    expect(getPositionOnPath(1050, rect)).toEqual({ x: 50, y: 250 });
  });

  it('clamps progress if out of bounds', () => {
    expect(getPositionOnPath(-10, rect)).toEqual({ x: 50, y: 100 });
    expect(getPositionOnPath(1300, rect)).toEqual({ x: 50, y: 100 });
  });
});
