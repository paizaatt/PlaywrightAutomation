# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/api/me/me.spec.ts >> API — Me >> GET /me trả về userId và username khi đã login
- Location: tests/api/me/me.spec.ts:5:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  1  | import { expect, test } from '../../../src/fixtures/api.fixture';
  2  | import { assertOpenApiResponse } from '../../../src/utils/openapi.validator';
  3  | 
  4  | test.describe('API — Me', () => {
  5  |   test('GET /me trả về userId và username khi đã login', async ({ authenticatedMeService }) => {
  6  |     const { response, body } = await authenticatedMeService.profile.getMeAndParse();
  7  | 
> 8  |     expect(response.status()).toBe(200);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  9  |     expect(body.userId).toBeTruthy();
  10 |     expect(body.username).toBeTruthy();
  11 |     assertOpenApiResponse('GET', '/me', body);
  12 |   });
  13 | 
  14 |   test('GET /me — response khớp OpenAPI schema', async ({ request }) => {
  15 |     const response = await request.get('/me');
  16 |     const body = await response.json();
  17 | 
  18 |     expect(response.status()).toBe(200);
  19 |     assertOpenApiResponse('GET', '/me', body);
  20 |   });
  21 | });
  22 | 
```