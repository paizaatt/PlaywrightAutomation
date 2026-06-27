import type { APIRequestContext } from '@playwright/test';
import { MeProfileComponent } from '../api-components/me-profile.component';

export class MeService {
  readonly profile: MeProfileComponent;

  constructor(request: APIRequestContext, baseURL: string) {
    this.profile = new MeProfileComponent(request, baseURL);
  }
}
