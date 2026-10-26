import type { CampaignProgress } from '../config/levels';
import { type ProgressRepository, createDefaultProgress } from './ProgressRepository';
import { IndexedDbProgress } from './IndexedDbProgress';

export interface LevelCompletionResult {
  victory: boolean;
  stars: 0 | 1 | 2 | 3;
  unlockedNext: boolean;
  highestUnlockedLevel: number;
}

export class CampaignController {
  private repository: ProgressRepository;
  private progress: CampaignProgress = createDefaultProgress();
  private isLoaded = false;

  constructor(repository?: ProgressRepository) {
    this.repository = repository ?? new IndexedDbProgress();
  }

  public async init(): Promise<CampaignProgress> {
    this.progress = await this.repository.load();
    this.isLoaded = true;
    return this.progress;
  }

  public getProgress(): CampaignProgress {
    return this.progress;
  }

  public canPlayLevel(levelId: number): boolean {
    if (levelId < 1 || levelId > 10) return false;
    return levelId <= this.progress.highestUnlockedLevel;
  }

  public getHighestUnlockedEggLevel(): number {
    if (this.progress.highestUnlockedEggLevel) {
      return this.progress.highestUnlockedEggLevel;
    }
    // Migration fallback: derive from completed boss levels if not stored
    if ((this.progress.results[10]?.bestStars ?? 0) > 0) return 3;
    if ((this.progress.results[5]?.bestStars ?? 0) > 0) return 2;
    return 1;
  }

  public calculateStars(baseHp: number): 0 | 1 | 2 | 3 {
    if (baseHp >= 3) return 3;
    if (baseHp === 2) return 2;
    if (baseHp === 1) return 1;
    return 0;
  }

  public async recordLevelResult(
    levelId: number,
    baseHp: number,
    kills: number
  ): Promise<LevelCompletionResult> {
    if (!this.isLoaded) {
      await this.init();
    }

    // Ignore results for locked/out-of-range levels. The map normally prevents
    // launching them, but progression must also enforce this invariant.
    if (!this.canPlayLevel(levelId)) {
      return {
        victory: false,
        stars: 0,
        unlockedNext: false,
        highestUnlockedLevel: this.progress.highestUnlockedLevel
      };
    }

    const victory = baseHp > 0;
    const stars = this.calculateStars(baseHp);

    if (!victory) {
      return {
        victory: false,
        stars: 0,
        unlockedNext: false,
        highestUnlockedLevel: this.progress.highestUnlockedLevel
      };
    }

    // Victory: preserve better results
    const prev = this.progress.results[levelId];
    const bestStars = Math.max(prev?.bestStars ?? 0, stars) as 1 | 2 | 3;
    const bestKills = Math.max(prev?.bestKills ?? 0, kills);

    this.progress.results[levelId] = {
      bestStars,
      bestKills
    };

    // Unlock egg levels on boss victories
    const currentEggLevel = this.getHighestUnlockedEggLevel();
    if (levelId === 5 && currentEggLevel < 2) {
      this.progress.highestUnlockedEggLevel = 2;
    } else if (levelId === 10 && currentEggLevel < 3) {
      this.progress.highestUnlockedEggLevel = 3;
    }

    let unlockedNext = false;
    if (levelId < 10) {
      const nextLevel = levelId + 1;
      if (nextLevel > this.progress.highestUnlockedLevel) {
        this.progress.highestUnlockedLevel = nextLevel;
        unlockedNext = true;
      }
    }

    await this.repository.save(this.progress);

    return {
      victory: true,
      stars,
      unlockedNext,
      highestUnlockedLevel: this.progress.highestUnlockedLevel
    };
  }

  public getTotalStars(): number {
    return Object.values(this.progress.results).reduce(
      (sum, res) => sum + (res?.bestStars ?? 0),
      0
    );
  }
}

