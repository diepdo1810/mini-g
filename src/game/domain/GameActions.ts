export type GameAction =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'ATTACK_EGG'; heroId: string; eggId?: string }
  | { type: 'MOVE_HERO'; heroId: string; targetRow: number; targetCol: number }
  | { type: 'MERGE_HERO'; sourceId: string; targetId: string }
  | { type: 'SELECT_HERO'; heroId?: string };

