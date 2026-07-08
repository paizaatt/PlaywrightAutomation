/**
 * Mocking fixtures — isolated from api.fixture.ts and test.fixture.ts.
 * Import this test object only in specs under tests/ui/mock/ or tests/mock/.
 */
import { test as uiTest, expect } from './test.fixture';
import { MockFactory } from '../mock/mock-factory';
import { mockLog } from '../mock/mock-logger';
import { describeMockStorage, resolveMockStorageFromEnv } from '../mock/mock-storage.config';
import { MockRouteController } from '../mock/route-helpers';

type MockFixtures = {
  mockFactory: MockFactory;
  mockApi: MockRouteController;
};

export const test = uiTest.extend<MockFixtures>({
  mockFactory: async ({ page }, use) => {
    void page;
    const storage = resolveMockStorageFromEnv();
    mockLog('fixture.init', 'Creating mockFactory fixture for test', {
      storage: describeMockStorage(storage),
    });
    const factory = MockFactory.create({ storage });
    await use(factory);
    mockLog('fixture.teardown', 'mockFactory fixture released');
  },

  mockApi: async ({ page, mockFactory }, use) => {
    mockLog('fixture.init', 'Creating schema-driven mock API router');
    await use(new MockRouteController(page, mockFactory));
    mockLog('fixture.teardown', 'mock API router released');
  },
});

export { expect };
