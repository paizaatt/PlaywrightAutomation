import { expect, test } from '../../../src/fixtures/api.fixture';
import { assertOpenApiResponse } from '../../../src/utils/openapi.validator';

test.describe('API — Quest Stages', () => {
  test('GET /api/quest/stages trả về danh sách chapter khi đã login', async ({
    authenticatedQuestService,
  }) => {
    const { response, body } = await authenticatedQuestService.stages.getStagesAndParse();

    expect(response.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    assertOpenApiResponse('GET', '/api/quest/stages', body);
  });

  test('GET /api/quest/stages — stageOrder tăng dần', async ({ authenticatedQuestService }) => {
    const { body } = await authenticatedQuestService.stages.getStagesAndParse();
    const orders = body.map((stage) => stage.stageOrder);

    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  test('GET /api/quest/stages — response khớp OpenAPI schema', async ({ request }) => {
    const response = await request.get('/api/quest/stages');
    const body = await response.json();

    console.log('\n[Test Debug] HTTP status:', response.status());
    console.log('[Test Debug] Response URL:', response.url());

    expect(response.status()).toBe(200);
    assertOpenApiResponse('GET', '/api/quest/stages', body, 200, { debug: true });
  });
});
