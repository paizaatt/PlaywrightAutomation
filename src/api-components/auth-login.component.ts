import type { APIResponse } from '@playwright/test';
import { BaseApiComponent } from '../api-core/base-api.component';
import {
  API_ACCESS_TOKEN_COOKIE,
  type ApiLoginPayload,
  type ApiLoginResponse,
} from '../types/api/auth.types';

export class AuthLoginComponent extends BaseApiComponent {
  private readonly path = '/api/auth/login';

  login(payload: ApiLoginPayload): Promise<APIResponse> {
    return this.post(this.path, { data: payload });
  }

  async loginAndParse(payload: ApiLoginPayload): Promise<{
    response: APIResponse;
    body: ApiLoginResponse;
  }> {
    const response = await this.login(payload);
    const body = (await response.json()) as ApiLoginResponse;

    return { response, body };
  }

  /** Login và trả về accessToken (giá trị cookie `truytimkhobau_session`) */
  async loginAndGetToken(payload: ApiLoginPayload): Promise<string> {
    const response = await this.login(payload);

    if (!response.ok()) {
      throw new Error(`Login failed with status ${response.status()}`);
    }

    const { cookies } = await this.request.storageState();
    const accessToken = cookies.find((cookie) => cookie.name === API_ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      throw new Error(`Access token cookie "${API_ACCESS_TOKEN_COOKIE}" not found after login`);
    }

    return accessToken;
  }
}
