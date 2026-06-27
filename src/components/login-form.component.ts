import type { Locator } from '@playwright/test';
import type { LoginCredentials } from '../types/login.types';
import { BaseComponent } from './base.component';

export class LoginFormComponent extends BaseComponent {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(root: Locator) {
    super(root);
    this.usernameInput = root.locator('#username');
    this.passwordInput = root.locator('#password');
    this.submitButton = root.locator('button[type="submit"]', {
      hasText: 'Dang nhap',
    });
  }

  async fill(credentials: LoginCredentials): Promise<void> {
    await this.usernameInput.fill(credentials.username);
    await this.passwordInput.fill(credentials.password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(credentials: LoginCredentials): Promise<void> {
    await this.fill(credentials);
    await this.submit();
  }
}
