import type { Page, Route } from '@playwright/test';
import type { MockFactory } from './mock-factory';
import { mockLog } from './mock-logger';
import type { ApiLoginResponse } from '../types/api/auth.types';

type RouteMatcher = Parameters<Page['route']>[0];
type JsonObject = Record<string, unknown>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MockRouteOptions = {
  status?: number;
  contentType?: string;
  delayMs?: number;
  routePattern?: RouteMatcher;
};

export type MockOperationRouteOptions<TResponse> = MockRouteOptions & {
  method: HttpMethod;
  path: string;
  overrides?: Partial<TResponse>;
};

function safePostData(requestRoute: Route): JsonObject | null {
  const postData = requestRoute.request().postData();
  if (!postData) return null;

  try {
    return JSON.parse(postData) as JsonObject;
  } catch {
    return { raw: postData };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRouteMatcher(path: string): RouteMatcher {
  if (!path.includes('{')) {
    return `**${path}`;
  }

  const regexPath = path
    .split('/')
    .map((segment) =>
      segment.startsWith('{') && segment.endsWith('}') ? '[^/]+' : escapeRegExp(segment),
    )
    .join('/');

  return new RegExp(`${regexPath}$`);
}

export class MockRouteController {
  constructor(
    private readonly page: Page,
    private readonly mockFactory: MockFactory,
  ) {}

  async route<TResponse>(options: MockOperationRouteOptions<TResponse>): Promise<TResponse> {
    const status = options.status ?? 200;
    const contentType = options.contentType ?? 'application/json';
    const method = options.method.toUpperCase() as HttpMethod;
    const matcher = options.routePattern ?? buildRouteMatcher(options.path);

    mockLog('route.setup', `Preparing ${method} ${options.path} mock route`, {
      status,
      contentType,
      matcher: String(matcher),
      overrides: options.overrides,
    });

    const mockBody = await this.mockFactory.generateForOperation<TResponse>(
      method,
      options.path,
      'response',
      options.overrides,
      status,
    );

    mockLog('route.setup', 'Mock body generated — registering page.route()', {
      method,
      path: options.path,
      status,
      contentType,
      mockBody,
    });

    await this.page.route(matcher, async (route: Route) => {
      const request = route.request();

      mockLog('route.intercept', 'Incoming request matched mock route', {
        url: request.url(),
        method: request.method(),
        requestBody: safePostData(route),
      });

      if (request.method().toUpperCase() !== method) {
        mockLog('route.intercept', `${request.method()} request — passing through to real server`);
        await route.continue();
        return;
      }

      if (options.delayMs) {
        mockLog('route.intercept', `Simulating network delay: ${options.delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }

      mockLog('route.fulfill', 'Fulfilling route with schema-driven mock response', {
        status,
        contentType,
        body: mockBody,
      });

      await route.fulfill({
        status,
        contentType,
        body: JSON.stringify(mockBody),
      });
    });

    mockLog('route.setup', 'Mock route registered successfully', {
      method,
      path: options.path,
    });

    return mockBody;
  }

  async authLogin(
    overrides?: Partial<ApiLoginResponse>,
    options: MockRouteOptions = {},
  ): Promise<ApiLoginResponse> {
    return this.route<ApiLoginResponse>({
      method: 'POST',
      path: '/api/auth/login',
      overrides,
      ...options,
    });
  }
}

/**
 * Intercept POST /api/auth/login and fulfill with schema-driven mock body.
 * Uses ** glob so it works for any host (UI → BE cross-origin).
 *
 * @deprecated Prefer the `mockApi` fixture: `await mockApi.authLogin(overrides)`.
 */
export async function mockAuthLoginRoute(
  page: Page,
  mockFactory: MockFactory,
  overrides?: Partial<ApiLoginResponse>,
  options: MockRouteOptions = {},
): Promise<ApiLoginResponse> {
  return new MockRouteController(page, mockFactory).authLogin(overrides, options);
}
