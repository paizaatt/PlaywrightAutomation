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
  // Bổ sung thêm dòng xuất JSON vào mảng reporter
  reporter: [
    ['html', { open: 'never' }], 
    ['list'],
    ['json', { outputFile: 'config/playwright-report/results.json' }] // Dòng mới thêm
  ],
  use: {
    // 1. CẤU HÌNH TRACE, SCREENSHOT, VIDEO
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 2. CẤU HÌNH MẠNG & ĐƯỜNG DẪN (NÊN THÊM)
    // Tận dụng biến môi trường bạn đã setup ở file playwright.yml
    //baseURL: process.env.BASE_URL || 'http://localhost:8080', 

    // 3. CẤU HÌNH TIMEOUT (NÊN THÊM)
    // Giới hạn thời gian tối đa cho 1 thao tác (click, fill, hover...) để tránh test bị treo vô hạn
    actionTimeout: 15000, 
    // Giới hạn thời gian tối đa khi chuyển trang (page.goto)
    navigationTimeout: 30000,

    // 4. CẤU HÌNH GIAO DIỆN TRÌNH DUYỆT (NÊN THÊM)
    // Đảm bảo kích thước màn hình luôn đồng nhất giữa máy Local và máy ảo GitHub
    viewport: { width: 1920, height: 1080 },
    
    // Bỏ qua lỗi chứng chỉ SSL (Rất hữu ích khi test ở môi trường Staging/Dev chưa có HTTPS chuẩn)
    ignoreHTTPSErrors: true,
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
