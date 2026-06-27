import type { APIRequestContext } from '@playwright/test';
import { QuestStagesComponent } from '../api-components/quest-stages.component';

export class QuestService {
  readonly stages: QuestStagesComponent;

  constructor(request: APIRequestContext, baseURL: string) {
    this.stages = new QuestStagesComponent(request, baseURL);
  }
}
