import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/domain/GameEngine';
import { GameBalance } from '../src/game/config/GameBalance';
import { isSwordHittingEgg } from '../src/game/domain/HitDetection';

describe('PHASE 3 FEEDBACK - Sát thương & Vị trí trứng', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('1 & 3: Kiếm xoay của hero hàng cuối (row=4, col=2) tự đánh trúng trứng khi quay xuống', () => {
    const state = engine.getState();
    // Place a hero at row 4, col 2
    state.heroes.push({
      id: 'hero-bottom',
      kind: 'A',
      row: 4,
      col: 2,
      tier: 0,
      angle: Math.PI / 2 // pointing straight down towards egg
    });

    const initialEggHp = state.egg.hp;
    expect(initialEggHp).toBe(3);

    // Tick tiny delta so sword is still pointing down
    engine.tick(0.001);

    // Egg should have taken 1 damage from orbit hit!
    expect(engine.getState().egg.hp).toBe(initialEggHp - 1);

    // Kills should not be affected
    expect(engine.getState().kills).toBe(0);

    // Respects 500ms orbit cooldown: immediate next tick doesn't hit again
    engine.tick(0.01);
    expect(engine.getState().egg.hp).toBe(initialEggHp - 1);
  });

  it('3: Hero hàng trên (row=0..3) KHÔNG chạm được trứng', () => {
    const state = engine.getState();
    // Top hero at (0, 2) pointing down
    const heroTop = state.heroes[0];
    heroTop.angle = Math.PI / 2;

    const initialEggHp = state.egg.hp;
    engine.tick(0.001);
    // Must NOT hit egg
    expect(state.egg.hp).toBe(initialEggHp);

    // Hero at row 3 (one row above bottom) pointing down
    state.heroes.push({
      id: 'hero-row-3',
      kind: 'A',
      row: 3,
      col: 2,
      tier: 0,
      angle: Math.PI / 2
    });

    engine.tick(0.001);
    // Must NOT hit egg
    expect(state.egg.hp).toBe(initialEggHp);
  });

  it('2: Đánh quái hoàn toàn KHÔNG làm trứng mất HP', () => {
    const state = engine.getState();
    const hero = state.heroes[0]; // at (0, 2)
    const monster = state.monsters[0];

    // Align hero with monster at top path
    hero.angle = -Math.PI / 2;
    monster.progress = 160;

    const eggHpBefore = state.egg.hp;
    const monsterHpBefore = monster.hp;

    // Hit monster
    engine.tick(0.001);

    // Monster lost HP
    expect(engine.getState().monsters[0].hp).toBe(monsterHpBefore - 1);
    // Egg HP is STRICTLY unchanged!
    expect(engine.getState().egg.hp).toBe(eggHpBefore);

    // Kill monster
    engine.getState().monsters[0].hp = 1;
    hero.angle = -Math.PI / 2;
    for (let i = 0; i < 5; i++) engine.tick(0.1); // clear monster cooldown
    hero.angle = -Math.PI / 2;
    engine.tick(0.001);

    // Monster killed, kills += 1
    expect(engine.getState().kills).toBe(1);
    expect(engine.getState().monsters.length).toBe(0);
    // Egg HP still strictly unchanged!
    expect(engine.getState().egg.hp).toBe(eggHpBefore);
  });

  it('4: Kéo hero vào trứng vẫn gây sát thương, hero không rời ô cờ', () => {
    const state = engine.getState();
    const hero = state.heroes[0];
    expect(hero.row).toBe(0);
    expect(hero.col).toBe(2);

    const initialEggHp = state.egg.hp;
    engine.dispatch({ type: 'ATTACK_EGG', heroId: hero.id });

    expect(state.egg.hp).toBe(initialEggHp - 1);
    // Hero remains at original cell
    expect(hero.row).toBe(0);
    expect(hero.col).toBe(2);
  });

  it('5: Không bị double hit khi orbit và drag xảy ra trong cùng simulation tick', () => {
    const state = engine.getState();
    // Place hero at (4, 2) pointing down
    const heroBottom = {
      id: 'hero-bottom',
      kind: 'A' as const,
      row: 4,
      col: 2,
      tier: 0,
      angle: Math.PI / 2
    };
    state.heroes.push(heroBottom);

    const initialHp = state.egg.hp;

    // Dispatch drag attack in the same tick that orbit hit would also collide
    engine.dispatch({ type: 'ATTACK_EGG', heroId: heroBottom.id });
    engine.tick(0.001);

    // Egg must only take 1 damage (deduplicated!), not 2!
    expect(engine.getState().egg.hp).toBe(initialHp - 1);
  });

  it('6: Ghép hero không làm mất trạng thái wave, quái hoặc trứng', () => {
    const state = engine.getState();
    state.wave = 3;
    state.monsters = [
      { id: 'm-keep', hp: 5, maxHp: 5, progress: 200, speed: 35 }
    ];
    state.egg.hp = 7;
    state.egg.maxHp = 7;
    state.baseHp = 2;

    // Add 2 heroes that can merge
    state.heroes = [
      { id: 'h1', kind: 'A', row: 1, col: 1, tier: 1, angle: 0 },
      { id: 'h2', kind: 'A', row: 1, col: 2, tier: 1, angle: 0 }
    ];

    engine.dispatch({ type: 'MERGE_HERO', sourceId: 'h1', targetId: 'h2' });

    const stateAfter = engine.getState();
    expect(stateAfter.heroes.length).toBe(1);
    expect(stateAfter.heroes[0].tier).toBe(2);

    // Verify all other state is 100% intact
    expect(stateAfter.wave).toBe(3);
    expect(stateAfter.monsters.length).toBe(1);
    expect(stateAfter.monsters[0].id).toBe('m-keep');
    expect(stateAfter.monsters[0].hp).toBe(5);
    expect(stateAfter.egg.hp).toBe(7);
    expect(stateAfter.baseHp).toBe(2);
  });

  it('7: Hình học: Trứng nằm sát bàn cờ, ngoài path quái và trong tầm kiếm hero hàng cuối', () => {
    const pathRect = GameBalance.PATH.RECT;
    const eggCenter = { x: GameBalance.EGG.CENTER_X, y: GameBalance.EGG.CENTER_Y };
    const eggTop = eggCenter.y - GameBalance.EGG.RADIUS_Y;

    // Egg top must be strictly below bottom path line to avoid overlapping monster route
    expect(eggTop).toBeGreaterThanOrEqual(pathRect.bottom);

    // Hero at (4, 2) center:
    const hero42Center = {
      x: GameBalance.BOARD.X + (2 + 0.5) * GameBalance.BOARD.CELL_SIZE,
      y: GameBalance.BOARD.Y + (4 + 0.5) * GameBalance.BOARD.CELL_SIZE
    };

    // Sword reach:
    const reach = GameBalance.SWORD.OFFSET_START + GameBalance.SWORD.LENGTH;
    const maxReach = reach + GameBalance.SWORD.HITBOX_RADIUS;

    // Distance from hero (4, 2) to egg top:
    const distToEggTop = eggTop - hero42Center.y;
    expect(distToEggTop).toBeLessThan(maxReach);

    // Geometric hit detection function confirms hit at downward angle PI/2
    const isHit = isSwordHittingEgg(
      hero42Center,
      Math.PI / 2,
      GameBalance.SWORD.OFFSET_START,
      GameBalance.SWORD.LENGTH,
      GameBalance.SWORD.HITBOX_RADIUS,
      eggCenter,
      GameBalance.EGG.RADIUS_X,
      GameBalance.EGG.RADIUS_Y
    );
    expect(isHit).toBe(true);
  });

  it('First hatch: Ưu tiên spawn hero A1 tại (row=4, col=2) để người chơi thấy kiếm chém trứng', () => {
    const heroInit = engine.getState().heroes[0]; // at (0, 2)

    // Damage egg 1 to 0 HP
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 3; t++) engine.tick(0.1);
      engine.dispatch({ type: 'ATTACK_EGG', heroId: heroInit.id });
    }
    for (let t = 0; t < 26; t++) engine.tick(0.1);

    const state = engine.getState();
    expect(state.heroes.length).toBe(2);

    const secondHero = state.heroes[1];
    expect(secondHero.kind).toBe('A');
    expect(secondHero.tier).toBe(0);
    // Must be spawned at (4, 2)!
    expect(secondHero.row).toBe(4);
    expect(secondHero.col).toBe(2);

    // Now tick: this newly spawned hero at (4, 2) automatically chops egg 2 as its weapon rotates!
    secondHero.angle = Math.PI / 2;
    const egg2HpBefore = state.egg.hp; // 5 HP
    engine.tick(0.001);
    expect(state.egg.hp).toBe(egg2HpBefore - 1);
  });
});

