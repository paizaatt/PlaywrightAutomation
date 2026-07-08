import { test as base, expect } from '@playwright/test';

import { MockFactory } from '../mock/mock-factory';
import { mockLog } from '../mock/mock-logger';
import { describeMockStorage, resolveMockStorageFromEnv } from '../mock/mock-storage.config';

type ApiMockWorkerFixtures = {
  mockFactory: MockFactory;
};

type ApiMockTestFixtures = Record<never, never>;

export const test = base.extend<ApiMockTestFixtures, ApiMockWorkerFixtures>({
  mockFactory: [
    async ({ browserName }, use, workerInfo) => {
      const storage = resolveMockStorageFromEnv();

      mockLog('fixture.worker.init', 'Creating worker-scoped MockFactory for API mock tests', {
        browserName,
        workerIndex: workerInfo.workerIndex,
        storage: describeMockStorage(storage),
      });

      const factory = MockFactory.create({ storage });

      await use(factory);

      mockLog('fixture.worker.teardown', 'Worker-scoped MockFactory released', {
        workerIndex: workerInfo.workerIndex,
      });
    },
    { scope: 'worker' },
  ],
});

export { expect };
