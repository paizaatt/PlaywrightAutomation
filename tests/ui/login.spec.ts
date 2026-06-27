import { env } from '../../config/env.config';
import { expect, test } from '../../src/fixtures/test.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Authentication — Login', () => {
  test('đăng nhập thành công với username và password hợp lệ (admin/admin)', async ({
    loginPage,
    automationPage,
    page,
  }) => {
    await loginPage.goto();

    await expect(loginPage.title).toHaveText('Truy Tìm Kho Báu');
    await expect(loginPage.subtitle).toHaveText('Dang nhap de su dung Automation UI');

    await loginPage.loginForm.login({
      username: env.auth.username,
      password: env.auth.password,
    });

    await expect(page).toHaveURL('/');
    await expect(loginPage.loginForm.submitButton).not.toBeVisible();
    await expect(automationPage.customAccountForm.usernameInput).toBeVisible();
  });

  test('File test thứ 2 trong Login', async ({ page }) => {
    await page.goto('https://google.com');

    // Cố tình tạo một lỗi trong console trình duyệt
    await page.evaluate(() => console.error('ĐÂY LÀ LỖI GIẢ ĐỂ TEST FIXTURE'));

    // Làm cho test thất bại để fixture thực hiện đính kèm log
    expect(true).toBe(false);
  });
});
