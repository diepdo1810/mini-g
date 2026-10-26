export type GameAction =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'ATTACK_EGG'; heroId: string; eggId?: string }
  | { type: 'MOVE_HERO'; heroId: string; targetRow: number; targetCol: number }
  | { type: 'MERGE_HERO'; sourceId: string; targetId: string }
  | { type: 'CLAIM_HERO' }
  | { type: 'TOGGLE_AUTO_RECEIVE'; enabled?: boolean }
  | { type: 'SELECT_HERO'; heroId?: string };

