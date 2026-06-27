import { BaseApiComponent } from '../api-core/base-api.component';
import type { APIResponse } from '@playwright/test';
import type { ApiMeResponse } from '../types/api/me.types';

export class MeProfileComponent extends BaseApiComponent {
    private readonly path = '/me';

    getMe(): Promise<APIResponse> {
        return this.get(this.path);
    }

    async getMeAndParse(): Promise<{
        response: APIResponse;
        body: ApiMeResponse;
    }> {
        const response = await this.getMe();
        const body = (await response.json()) as ApiMeResponse;
        return { response, body };
    }
}