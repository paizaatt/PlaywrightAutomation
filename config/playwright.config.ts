import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import { apiAuthStoragePath, authStoragePath, env } from './env.config';

const apiUse = {
  baseURL: env.apiBaseUrl,
  extraHTTPHeaders: {
    accept: '*/*',
    'content-type': 'application/json',
  },
};

export default defineConfig({
  testDir: '../tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : Math.ceil(os.cpus().length / 2),
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: '.',
      testMatch: 'auth.setup.ts',
      use: {
        baseURL: env.baseUrl,
      },
    },
    {
      name: 'UI-Tests-co-cookie',
      testMatch: /\/e2e\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.baseUrl,
        storageState: authStoragePath,
      },
      dependencies: ['setup'],
    },
    {
      name: 'UI-Tests-no-cookie',
      testMatch: /\/ui\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.baseUrl,
      },
    },
    {
      name: 'API-Tests',
      testMatch: /\/api\/auth\/.*\.spec\.ts|\/api\/.*\/.*-unauthorized\.spec\.ts/,
      use: apiUse,
    },
    {
      name: 'api-setup',
      testDir: '.',
      testMatch: 'api-auth.setup.ts',
      use: apiUse,
      dependencies: ['API-Tests'],
    },
    {
      name: 'API-Tests-co-cookie',
      testMatch: /\/api\/(?!auth\/).*\.spec\.ts/,
      testIgnore: /-unauthorized\.spec\.ts/,
      use: {
        ...apiUse,
        storageState: apiAuthStoragePath,
      },
      dependencies: ['api-setup'],
    },
  ],
});
