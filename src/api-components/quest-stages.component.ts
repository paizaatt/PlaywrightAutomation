import type { APIResponse } from '@playwright/test';
import { BaseApiComponent } from '../api-core/base-api.component';
import type { ApiQuestStagesResponse } from '../types/api/quest.types';

export class QuestStagesComponent extends BaseApiComponent {
  private readonly path = '/api/quest/stages';

  getStages(): Promise<APIResponse> {
    return this.get(this.path);
  }

  async getStagesAndParse(): Promise<{
    response: APIResponse;
    body: ApiQuestStagesResponse;
  }> {
    const response = await this.getStages();
    const body = (await response.json()) as ApiQuestStagesResponse;

    return { response, body };
  }
}
