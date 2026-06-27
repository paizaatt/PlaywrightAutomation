import { env } from '../../config/env.config';
import { expect, test } from '../../src/fixtures/test.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Automation — Luồng Main()', () => {
  test('điền username, bank number, site mặc định và chạy Run with Custom Data', async ({
    authenticatedPage,
    page,
  }) => {
    const customData = env.customAccount;

    const runCustomResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/run/custom') && response.request().method() === 'POST',
    );

    await authenticatedPage.customAccountForm.fillAndRun(customData);

    const response = await runCustomResponse;
    const responseBody = await response.text();

    console.log('POST /run/custom — Status:', response.status());
    console.log('POST /run/custom — Body:', responseBody);

    await expect(authenticatedPage.jobOutput).not.toBeEmpty();
  });
});
