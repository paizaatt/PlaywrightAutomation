import { expect, test } from '../../../src/fixtures/api.fixture';

test('GET /me trả về 401 khi chưa có session cookie', async ({ meService }) => {
    const response = await meService.profile.getMe();
    expect(response.status()).toBe(401);
  });
  