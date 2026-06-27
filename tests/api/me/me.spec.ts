import { expect, test } from '../../../src/fixtures/api.fixture';
import { assertOpenApiResponse } from '../../../src/utils/openapi.validator';

test.describe('API — Me', () => {
  test('GET /me trả về userId và username khi đã login', async ({ authenticatedMeService }) => {
    const { response, body } = await authenticatedMeService.profile.getMeAndParse();

    expect(response.status()).toBe(200);
    expect(body.userId).toBeTruthy();
    expect(body.username).toBeTruthy();
    assertOpenApiResponse('GET', '/me', body);
  });

  test('GET /me — response khớp OpenAPI schema', async ({ request }) => {
    const response = await request.get('/me');
    const body = await response.json();

    expect(response.status()).toBe(200);
    assertOpenApiResponse('GET', '/me', body);
  });
});
