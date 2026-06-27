import fs from 'fs';
import path from 'path';
import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { AutomationPage } from '../pages/automation.page';
import { LoginPage } from '../pages/login.page';

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function buildTestSourceFrame(testInfo: TestInfo): string | undefined {
  const lastError = testInfo.errors.filter((error) => error.message).at(-1);
  if (!lastError?.stack) return undefined;

  const match = lastError.stack.match(
    new RegExp(`${path.basename(testInfo.file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`),
  );
  const errorLine = match ? Number(match[1]) : testInfo.line;
  const errorColumn = match ? Number(match[2]) : testInfo.column;

  try {
    const sourceLines = fs.readFileSync(testInfo.file, 'utf-8').split('\n');
    const linesAbove = 10;
    const linesBelow = 10;
    const start = Math.max(0, errorLine - linesAbove - 1);
    const end = Math.min(sourceLines.length, errorLine + linesBelow);
    const lineNumberWidth = String(end).length;
    const message = stripAnsi(lastError.message || '').split('\n')[0];

    const frame = sourceLines.slice(start, end).map((line, index) => {
      const lineNo = start + index + 1;
      const prefix = lineNo === errorLine ? '> ' : '  ';
      return `${prefix}${String(lineNo).padEnd(lineNumberWidth, ' ')} | ${line}`;
    });

    if (message) {
      frame.splice(
        errorLine - start,
        0,
        `${' '.repeat(lineNumberWidth + 2)} | ${' '.repeat(Math.max(0, errorColumn - 2))} ^ ${message}`,
      );
    }

    return frame.join('\n');
  } catch {
    return undefined;
  }
}

async function attachErrorContextInline(page: Page, testInfo: TestInfo): Promise<void> {
  let pageSnapshot: string | undefined;
  try {
    pageSnapshot = await page.ariaSnapshot({ mode: 'ai', timeout: 5_000 });
  } catch {
    // page có thể đã đóng hoặc không truy cập được snapshot
  }

  const meaningfulErrors = testInfo.errors.filter((error) => error.message);
  if (!meaningfulErrors.length && !pageSnapshot) return;

  const lines = [
    '# Instructions',
    '',
    '- Following Playwright test failed.',
    '- Explain why, be concise, respect Playwright best practices.',
    '- Provide a snippet of code with the fix, if possible.',
    '',
    '# Test info',
    '',
    `- Name: ${testInfo.titlePath.join(' >> ')}`,
    `- Location: ${testInfo.file}:${testInfo.line}:${testInfo.column}`,
  ];

  if (meaningfulErrors.length) {
    lines.push('', '# Error details');
    for (const error of meaningfulErrors) {
      lines.push('', '```', stripAnsi(error.message || ''), '```');
    }
  }

  if (pageSnapshot) {
    lines.push('', '# Page snapshot', '', '```yaml', pageSnapshot, '```');
  }

  const codeFrame = buildTestSourceFrame(testInfo);
  if (codeFrame) {
    lines.push('', '# Test source', '', '```ts', codeFrame, '```');
  }

  await testInfo.attach('Error Context', {
    body: lines.join('\n'),
    contentType: 'text/markdown',
  });
}

type AppFixtures = {
  automationPage: AutomationPage;
  loginPage: LoginPage;
  authenticatedPage: AutomationPage;
};

export const test = base.extend<AppFixtures>({
  // --- PHẦN THÊM MỚI: Ghi đè page để tự động bắt log ---
  page: async ({ page }, use, testInfo) => {
    const logs: string[] = [];

    const consoleHandler = (msg: any) => {
      const logEntry = `[${new Date().toISOString().split('T')[1]}] [${msg.type().toUpperCase()}] ${msg.text()}`;
      logs.push(logEntry);
    };

    page.on('console', consoleHandler);

    await use(page);

    //teardown lỗi khi test thất bại
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('Browser Console Logs', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      });

      // Playwright ghi error-context.md sau khi fixture page teardown,
      // nên build nội dung tương đương và attach trực tiếp lên report.
      await attachErrorContextInline(page, testInfo);
    }

    page.off('console', consoleHandler);
  }, 
  // --- HẾT PHẦN THÊM MỚI ---

  automationPage: async ({ page }, use) => {
    const automationPage = new AutomationPage(page);
    await use(automationPage);
  },
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  authenticatedPage: async ({ page, automationPage }, use) => {
    await automationPage.goto();
    await expect(automationPage.customAccountForm.usernameInput).toBeVisible();
    await use(automationPage);
  },
});

export { expect } from '@playwright/test';
