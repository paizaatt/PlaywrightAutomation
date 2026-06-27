import type { Page } from '@playwright/test';
import { LoginFormComponent } from '../components/login-form.component';

export class LoginPage {
  readonly loginForm: LoginFormComponent;
  readonly title: ReturnType<Page['locator']>;
  readonly subtitle: ReturnType<Page['locator']>;

  constructor(private readonly page: Page) {
    this.loginForm = new LoginFormComponent(
      page.locator('.login-card form[action="/login"]'),
    );
    this.title = page.locator('.login-card h1');
    this.subtitle = page.locator('.login-card .subtitle');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.loginForm.usernameInput.waitFor({ state: 'visible' });
  }
}
