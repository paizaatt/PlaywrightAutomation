import { expect, test } from '../../../src/fixtures/api.fixture';

test.describe('API — Quest Stages (Unauthorized)', () => {
  test('GET /api/quest/stages trả về 401 khi chưa có session cookie', async ({
    questService,
  }) => {
    const response = await questService.stages.getStages();

    expect(response.status()).toBe(401);
  });
});
