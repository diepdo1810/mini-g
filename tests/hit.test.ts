import { describe, it, expect } from 'vitest';
import {
  distancePointToSegment,
  isSwordHittingMonster,
  getSwordSegment
} from '../src/game/domain/HitDetection';

describe('HitDetection', () => {
  it('calculates distance from point to line segment accurately', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };

    // Point above segment
    expect(distancePointToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
    // Point past end B
    expect(distancePointToSegment({ x: 14, y: 0 }, a, b)).toBeCloseTo(4);
    // Point before start A
    expect(distancePointToSegment({ x: -3, y: 4 }, a, b)).toBeCloseTo(5);
  });

  it('calculates sword segment given hero center and angle', () => {
    const heroCenter = { x: 100, y: 100 };
    const offset = 10;
    const length = 40;
    // Angle pointing right (0 rad)
    const seg = getSwordSegment(heroCenter, 0, offset, length);
    expect(seg.start.x).toBeCloseTo(110);
    expect(seg.start.y).toBeCloseTo(100);
    expect(seg.end.x).toBeCloseTo(150);
    expect(seg.end.y).toBeCloseTo(100);
  });

  it('detects collision when monster circle intersects sword hitbox', () => {
    const heroCenter = { x: 225, y: 188 }; // Hero at (0, 2)
    const angle = -Math.PI / 2; // Pointing straight up
    const offset = 14;
    const length = 56; // Reach up to y = 188 - 70 = 118
    const swordRadius = 8;
    const monsterRadius = 16;

    // Monster at top path (x=225, y=134)
    // Distance from hero is 54 px, which is within [14, 70]
    const monsterPos = { x: 225, y: 134 };

    const isHit = isSwordHittingMonster(
      heroCenter,
      angle,
      offset,
      length,
      swordRadius,
      monsterPos,
      monsterRadius
    );
    expect(isHit).toBe(true);
  });

  it('does not detect collision if monster is outside sword reach or angle', () => {
    const heroCenter = { x: 225, y: 188 };
    const angle = Math.PI / 2; // Pointing straight down (opposite direction)
    const offset = 14;
    const length = 56;
    const swordRadius = 8;
    const monsterRadius = 16;

    const monsterPos = { x: 225, y: 134 }; // Monster still at top path

    const isHit = isSwordHittingMonster(
      heroCenter,
      angle,
      offset,
      length,
      swordRadius,
      monsterPos,
      monsterRadius
    );
    expect(isHit).toBe(false);
  });
});

