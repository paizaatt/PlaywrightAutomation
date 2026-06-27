import { test as base, expect, type APIResponse, type TestInfo } from '@playwright/test';

import { env } from '../../config/env.config';

import { AuthService } from '../api-services/auth.service';

import { QuestService } from '../api-services/quest.service';
import { MeService } from '../api-services/me.service';



type ApiFixtures = {

  authService: AuthService;

  questService: QuestService;

  authenticatedQuestService: QuestService;

  meService: MeService;

  authenticatedMeService: MeService;

};



async function attachApiFailureContext(

  response: APIResponse | undefined,

  testInfo: TestInfo,

): Promise<void> {

  if (!response) return;



  const headers = response.headers();

  const bodyText = await response.text().catch(() => '');



  const content = [

    `# API Response Context`,

    '',

    `- URL: ${response.url()}`,

    `- Status: ${response.status()} ${response.statusText()}`,

    '',

    '## Response Headers',

    '```json',

    JSON.stringify(headers, null, 2),

    '```',

    '',

    '## Response Body',

    '```json',

    bodyText,

    '```',

  ].join('\n');



  await testInfo.attach('API Response Context', {

    body: content,

    contentType: 'text/markdown',

  });

}



export const test = base.extend<ApiFixtures>({

  authService: async ({ request }, use) => {

    const authService = new AuthService(request, env.apiBaseUrl);

    await use(authService);

  },



  questService: async ({ request }, use) => {

    const questService = new QuestService(request, env.apiBaseUrl);

    await use(questService);

  },



  authenticatedQuestService: async ({ request }, use) => {

    const questService = new QuestService(request, env.apiBaseUrl);

    await use(questService);

  },

  meService: async ({ request }, use) => {
    const meService = new MeService(request, env.apiBaseUrl);
    await use(meService);
  },

  authenticatedMeService: async ({ request }, use) => {
    const meService = new MeService(request, env.apiBaseUrl);
    await use(meService);
  },

});



export { expect };



export async function expectApiOk(

  response: APIResponse,

  testInfo?: TestInfo,

): Promise<void> {

  if (!response.ok() && testInfo) {

    await attachApiFailureContext(response, testInfo);

  }



  expect(response.ok(), `Expected 2xx but got ${response.status()}`).toBeTruthy();

}



