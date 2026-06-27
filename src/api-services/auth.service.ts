import type { APIRequestContext } from '@playwright/test';
import { AuthLoginComponent } from '../api-components/auth-login.component';

export class AuthService {
  readonly auth: AuthLoginComponent;

  constructor(request: APIRequestContext, baseURL: string) {
    this.auth = new AuthLoginComponent(request, baseURL);
  }
}
