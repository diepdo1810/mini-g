import { CampaignController } from './CampaignController';
import { IndexedDbProgress } from './IndexedDbProgress';

let instance: CampaignController | null = null;

export function getCampaignController(): CampaignController {
  if (!instance) {
    const repo = new IndexedDbProgress();
    instance = new CampaignController(repo);
  }
  return instance;
}

export function resetCampaignControllerForTest(controller?: CampaignController): void {
  instance = controller ?? null;
}

