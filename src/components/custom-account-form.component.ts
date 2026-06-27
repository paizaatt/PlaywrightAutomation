import type { Locator } from '@playwright/test';
import type { CustomAccountData } from '../types/custom-account.types';
import { BaseComponent } from './base.component';

export class CustomAccountFormComponent extends BaseComponent {
  readonly usernameInput: Locator;
  readonly bankNumberInput: Locator;
  readonly siteInput: Locator;
  readonly runWithCustomDataButton: Locator;

  constructor(root: Locator) {
    super(root);
    this.usernameInput = root.locator('#username');
    this.bankNumberInput = root.locator('#bank');
    //dùng getByRole theo suggest best practice của Playwright
    this.siteInput = root.getByRole('textbox', { name: 'Site' });
    this.runWithCustomDataButton = root.locator('button.btn-custom', {
      hasText: 'Run with Custom Data',
    });
  }

  async fill(data: CustomAccountData): Promise<void> {
    await this.usernameInput.fill(data.username);
    await this.bankNumberInput.fill(data.bankNumber);
    await this.siteInput.fill(data.site);
  }

  async clickRunWithCustomData(): Promise<void> {
    await this.runWithCustomDataButton.click();
  }

  async fillAndRun(data: CustomAccountData): Promise<void> {
    await this.fill(data);
    await this.clickRunWithCustomData();
  }
}
