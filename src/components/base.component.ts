import type { Locator } from '@playwright/test';

export abstract class BaseComponent {
  constructor(protected readonly root: Locator) {}
}
