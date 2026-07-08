/* eslint-disable no-console */

const LOG_PREFIX = '[Mock]';

/** Set MOCK_DEBUG=0 to silence mock framework logs in CI or local runs. */
function isMockDebugEnabled(): boolean {
  return process.env.MOCK_DEBUG !== '0';
}

function formatData(data: unknown): string {
  if (data === undefined) return '';
  return `\n${JSON.stringify(data, null, 2)}`;
}

export function mockLog(step: string, message: string, data?: unknown): void {
  if (!isMockDebugEnabled()) return;
  console.log(`${LOG_PREFIX} [${step}] ${message}${formatData(data)}`);
}

export function mockLogStep(step: number, title: string, data?: unknown): void {
  mockLog(`Step ${step}`, title, data);
}
