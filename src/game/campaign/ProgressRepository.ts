import type { CampaignProgress } from '../config/levels';

export interface ProgressRepository {
  load(): Promise<CampaignProgress>;
  save(progress: CampaignProgress): Promise<void>;
  reset(): Promise<void>;
}

export function createDefaultProgress(): CampaignProgress {
  return {
    schemaVersion: 1,
    highestUnlockedLevel: 1,
    highestUnlockedEggLevel: 1,
    results: {}
  };
}

