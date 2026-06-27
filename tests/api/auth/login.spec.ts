import { env } from '../../../config/env.config';
import { expect, test } from '../../../src/fixtures/api.fixture';
import { assertOpenApiRequest, assertOpenApiResponse } from '../../../src/utils/openapi.validator';

test.describe('API — Auth Login', () => {
  test('POST /api/auth/login thành công với credentials hợp lệ', async ({ authService }) => {
    const payload = {
      username: env.apiAuth.username,
      bank: env.apiAuth.bank,
      site: env.apiAuth.site,
    };

    assertOpenApiRequest('POST', '/api/auth/login', payload);

    const { response, body } = await authService.auth.loginAndParse(payload);

    expect(response.status()).toBe(200);
    expect(body.username).toBe(env.apiAuth.username);
    expect(body.message).toMatch(/thành công/i);
    assertOpenApiResponse('POST', '/api/auth/login', body);
  });

  test('POST /api/auth/login trả về username khớp payload', async ({ authService }) => {
    const payload = {
      username: env.apiAuth.username,
      bank: env.apiAuth.bank,
      site: env.apiAuth.site,
    };

    assertOpenApiRequest('POST', '/api/auth/login', payload);

    const response = await authService.auth.login(payload);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toMatchObject({
      username: payload.username,
      message: expect.any(String),
    });
    assertOpenApiResponse('POST', '/api/auth/login', body);
  });
});
