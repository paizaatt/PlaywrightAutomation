import fs from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import { apiAuthStoragePath, env } from './env.config';
import { AuthService } from '../src/api-services/auth.service';

setup('api authenticate', async ({ request }) => {
  fs.mkdirSync(path.dirname(apiAuthStoragePath), { recursive: true });

  const authService = new AuthService(request, env.apiBaseUrl);
  const loginResponse = await authService.auth.login({
    username: env.apiAuth.username,
    bank: env.apiAuth.bank,
    site: env.apiAuth.site,
  });

  expect(loginResponse.ok()).toBeTruthy();
  await request.storageState({ path: apiAuthStoragePath });
});
