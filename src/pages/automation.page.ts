import type { Page } from '@playwright/test';
import { CustomAccountFormComponent } from '../components/custom-account-form.component';

export class AutomationPage {
  readonly customAccountForm: CustomAccountFormComponent;
  //tương đương
  readonly jobOutput: ReturnType<Page['locator']>;

  constructor(private readonly page: Page) {
    this.customAccountForm = new CustomAccountFormComponent(
      page.locator('#run-form'),
    );
    this.jobOutput = page.locator('#job-output');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }
}
