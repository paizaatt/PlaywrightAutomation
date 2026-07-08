import { expect, test } from '../../../src/fixtures/api-mock.fixture';
import { mockLog } from '../../../src/mock/mock-logger';
import { describeMockStorage } from '../../../src/mock/mock-storage.config';
import { SchemaRegistry } from '../../../src/mock/schema-registry';
import { assertOpenApiRequest, assertOpenApiResponse } from '../../../src/utils/openapi.validator';

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

const registry = SchemaRegistry.fromOpenApi();
const operationContracts = registry.listOperationContracts();
const dtoNames = registry.listDtoNames();

test.describe('API Mock Contract — OpenAPI schema generated data', () => {
  test.beforeAll(({ mockFactory }) => {
    mockLog('api-mock-contract.init', 'Starting API-layer mock contract suite', {
      storage: describeMockStorage(mockFactory.getStorageConfig()),
      operationCount: operationContracts.length,
      dtoCount: dtoNames.length,
      operations: operationContracts,
    });
  });

  test.describe('Component DTO schemas', () => {
    for (const dtoName of dtoNames) {
      test(`generates mock data for ${dtoName}`, async ({ mockFactory }) => {
        const data = await mockFactory.generate<JsonValue>(dtoName);

        expect(data, `${dtoName} should generate JSON-compatible mock data`).toBeDefined();
      });
    }
  });

  for (const operation of operationContracts) {
    test.describe(`${operation.method} ${operation.path}`, () => {
      if (operation.hasJsonRequestBody) {
        test('generates request mock data that satisfies OpenAPI schema', async ({
          mockFactory,
        }) => {
          const requestBody = await mockFactory.generateForOperation<JsonObject>(
            operation.method,
            operation.path,
            'request',
          );

          assertOpenApiRequest(operation.method, operation.path, requestBody);
        });
      }

      for (const statusCode of operation.jsonResponseStatusCodes) {
        test(`generates response mock data for status ${statusCode} that satisfies OpenAPI schema`, async ({
          mockFactory,
        }) => {
          const responseBody = await mockFactory.generateForOperation<JsonObject>(
            operation.method,
            operation.path,
            'response',
            undefined,
            statusCode,
          );

          assertOpenApiResponse(operation.method, operation.path, responseBody, statusCode);
        });
      }
    });
  }
});
