import { env } from '../../../config/env.config';
import { expect, test } from '../../../src/fixtures/custom-fixtures';
import { mockLogStep } from '../../../src/mock/mock-logger';
import type { ApiLoginResponse } from '../../../src/types/api/auth.types';

test.describe('Mock — Auth Login API (schema-driven)', () => {
  test('POST /api/auth/login — page.route + mockFactory.generate AuthResponseDto', async ({
    page,
    mockApi,
    mockFactory,
  }) => {
    const expectedUsername = 'mock_qa_user';

    mockLogStep(1, 'Register mock route for POST /api/auth/login with field overrides', {
      overrides: { username: expectedUsername, message: 'Đăng nhập thành công' },
    });

    const registeredMockBody = await mockApi.authLogin({
      username: expectedUsername,
      message: 'Đăng nhập thành công',
    });

    mockLogStep(
      2,
      'Mock route ready — body that will be returned on intercept',
      registeredMockBody,
    );

    mockLogStep(3, 'Render minimal login UI that calls the mocked API on button click');
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="vi">
        <body>
          <h1 id="login-title">Truy Tìm Kho Báu</h1>
          <p id="login-subtitle">Dang nhap de su dung Automation UI</p>
          <button id="login-btn" type="button">Đăng nhập</button>
          <p id="login-result"></p>
          <script>
            document.getElementById('login-btn').addEventListener('click', async () => {
              const response = await fetch('${env.apiBaseUrl}/api/auth/login', {
                method: 'POST',
                headers: {
                  accept: 'application/json',
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  username: '${env.apiAuth.username}',
                  bank: '${env.apiAuth.bank}',
                  site: '${env.apiAuth.site}',
                }),
              });
              const body = await response.json();
              document.getElementById('login-result').textContent =
                body.username + ' — ' + body.message;
            });
          </script>
        </body>
      </html>
    `);

    mockLogStep(4, 'Verify login UI is rendered');
    await expect(page.locator('#login-title')).toHaveText('Truy Tìm Kho Báu');
    await expect(page.locator('#login-subtitle')).toHaveText('Dang nhap de su dung Automation UI');

    mockLogStep(5, 'Click login button — expect intercepted mock response', {
      apiUrl: `${env.apiBaseUrl}/api/auth/login`,
      requestPayload: env.apiAuth,
    });

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') &&
          res.request().method() === 'POST' &&
          res.status() === 200,
      ),
      page.locator('#login-btn').click(),
    ]);

    const mockBody = (await response.json()) as ApiLoginResponse;
    mockLogStep(6, 'Response received from mocked route', mockBody);

    expect(mockBody.username).toBe(expectedUsername);
    expect(mockBody.message).toBe('Đăng nhập thành công');

    mockLogStep(7, 'Verify UI displays mocked username and message');
    await expect(page.locator('#login-result')).toHaveText(
      `${expectedUsername} — Đăng nhập thành công`,
    );

    mockLogStep(
      8,
      'Generate AuthResponseDto again without overrides — expect OpenAPI example values',
    );
    const fromSchema = await mockFactory.generate<ApiLoginResponse>('AuthResponseDto');
    mockLogStep(9, 'Schema-only mock data (from example fields in openapi.json)', fromSchema);

    expect(fromSchema.username).toBe('lokiit');
    expect(fromSchema.message).toBe('Đăng nhập thành công');
  });
});
