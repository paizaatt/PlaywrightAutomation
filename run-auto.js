const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { PlaywrightGhostCursor } = require('./src/utils/playwright-ghost-cursor.util');

chromium.use(stealth);

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const AUTH_USERNAME = process.env.UI_AUTH_USERNAME ?? 'admin';
const AUTH_PASSWORD = process.env.UI_AUTH_PASSWORD ?? 'admin';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) =>
  delay(Math.floor(Math.random() * (max - min + 1) + min));

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  const cursor = new PlaywrightGhostCursor(page, { visible: true });
  await cursor.init();

  try {
    console.log('Đang điều hướng tới trang đăng nhập...');
    await page.goto(`${BASE_URL}/login?next=%2F`);
    await page.waitForLoadState('networkidle');

    console.log('Đang nhập Username...');
    await cursor.click('#username', {
      label: 'Username input',
      paddingPercentage: 10,
      hesitate: 100,
    });
    await randomDelay(200, 500);
    await page.keyboard.type(AUTH_USERNAME, { delay: 100 });

    console.log('Đang nhập Password...');
    await cursor.click('#password', {
      label: 'Password input',
      paddingPercentage: 10,
      hesitate: 100,
    });
    await randomDelay(200, 500);
    await page.keyboard.type(AUTH_PASSWORD, { delay: 100 });

    console.log('Đang bấm nút Dang nhap...');
    await Promise.all([
      page.waitForURL(`${BASE_URL}/`),
      cursor.click('form[action="/login"] button[type="submit"]', {
        label: 'Login button',
        paddingPercentage: 10,
        hesitate: 150,
      }),
    ]);
    await page.waitForLoadState('networkidle');
    await randomDelay(1000, 2000);

    console.log('Đang thực thi lệnh: Bấm nút Run with Default...');
    const runDefaultButton = page.getByRole('button', {
      name: 'Run with Default',
      exact: true,
    });
    await runDefaultButton.waitFor({ state: 'visible' });

    const runDefaultResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/run/default') &&
        response.request().method() === 'POST',
    );

    await cursor.click(runDefaultButton, {
      label: 'Run with Default button',
      paddingPercentage: 15,
      hesitate: 200,
      waitForClick: 50,
    });

    const response = await runDefaultResponse;
    const responseBody = await response.text();
    console.log('POST /run/default — Status:', response.status());
    console.log('POST /run/default — Body:', responseBody);

    await page.locator('#job-output').waitFor({ state: 'visible' });
    await page
      .locator('#job-output')
      .filter({ hasText: /.+/ })
      .waitFor({ timeout: 10000 });

    console.log('=== Hoàn thành — job output đã hiển thị trên UI ===');
  } catch (error) {
    console.error('Lỗi khi chạy automation:', error.message);
    process.exitCode = 1;
  }

  // await browser.close();
})();
