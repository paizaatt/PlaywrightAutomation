import { test, expect } from '@playwright/test';

test('test1', async ({ page }) => {
  await page.goto('https://f8betbb1.vip/');
  await page.getByText('Không hiển thị nữa').click();
  await page.getByRole('button').click();
  await page.getByText('Đóng').click();
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('testcong');
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).press('Tab');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('a123123');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('button', { name: 'Nạp tiền' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Chuyển khoản ngân hàng' }).click();
  await page.getByText('NẠP NHANH 07 ❤️ Giới hạn nạp').click();
  await page.locator('.text-center').first().click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Thanh toán ngay bây giờ' }).click();
  const page1 = await page1Promise;
  await page1.waitForLoadState('domcontentloaded');

  const qrCodeContainer = page1.locator('.qr-code-container');
  await expect(qrCodeContainer).toBeVisible();
  await expect(qrCodeContainer).not.toBeEmpty();
  await expect(qrCodeContainer.locator('img.qrcode')).toBeVisible();
  await expect(qrCodeContainer.getByText('Scan here')).toBeVisible();

  const bankInfo = page1.locator('.bank-info');
  await expect(bankInfo).toBeVisible();
  await expect(bankInfo).not.toBeEmpty();
  await expect(bankInfo).not.toHaveText(/^\s*$/);

  const boxNotice = page1.locator('.box-notice');
  await expect(boxNotice).toBeVisible();
  await expect(boxNotice.locator('ol li')).not.toHaveCount(0);
});


test('test2', async ({ page }) => {
  await page.goto('https://f8betbb1.vip/');
  await page.getByRole('checkbox', { name: 'Không hiển thị nữa' }).check();
  await page.getByRole('button').click();
  await page.getByText('Đóng').click();
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('testcong');
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Mật khẩu' }).click();
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('a123123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('button', { name: 'Nạp tiền' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Chuyển khoản ngân hàng' }).click();
  await page.getByText('Giới hạn nạp tối thiểu').nth(2).click();
  await page.getByRole('combobox').selectOption('12');
  await page.getByPlaceholder('Vui lòng nhập số tiền').dblclick();
  await page.getByPlaceholder('Vui lòng nhập số tiền').fill('100');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Thanh toán ngay bây giờ' }).click();
  const page1 = await page1Promise;
  await page1.getByText('100,000VND').click();
});