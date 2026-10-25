import type { CampaignProgress, LevelResult } from '../config/levels';

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


/** Sanitize persisted campaign data without relying on browser APIs. */
export function sanitizeCampaignProgress(input: unknown): CampaignProgress {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return createDefaultProgress();
  const source = input as Record<string, unknown>;
  if (source.schemaVersion !== 1) return createDefaultProgress();

  const clampInt = (value: unknown, lo: number, hi: number, fallback: number): number => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(lo, Math.min(hi, Math.trunc(number))) : fallback;
  };

  const results: Record<number, LevelResult> = {};
  const storedResults = source.results;
  if (storedResults && typeof storedResults === 'object' && !Array.isArray(storedResults)) {
    for (const [key, value] of Object.entries(storedResults)) {
      const levelId = Number(key);
      if (!Number.isInteger(levelId) || levelId < 1 || levelId > 10 || key !== String(levelId)) continue;
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      const bestStars = clampInt(entry.bestStars, 0, 3, 0) as 0 | 1 | 2 | 3;
      const bestKills = clampInt(entry.bestKills, 0, Number.MAX_SAFE_INTEGER, 0);
      if (bestStars > 0 || bestKills > 0) results[levelId] = { bestStars, bestKills };
    }
  }

  const bossUnlock = (results[10]?.bestStars ?? 0) > 0
    ? 3
    : (results[5]?.bestStars ?? 0) > 0 ? 2 : 1;

  return {
    schemaVersion: 1,
    highestUnlockedLevel: clampInt(source.highestUnlockedLevel, 1, 10, 1),
    highestUnlockedEggLevel: Math.max(
      bossUnlock,
      clampInt(source.highestUnlockedEggLevel, 1, 3, 1)
    ),
    results
  };
}
