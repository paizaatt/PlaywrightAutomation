import fs from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import { AutomationPage } from '../src/pages/automation.page';
import { LoginPage } from '../src/pages/login.page';
import { authStoragePath, env } from './env.config';

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authStoragePath), { recursive: true });

  const loginPage = new LoginPage(page);
  const automationPage = new AutomationPage(page);

  await loginPage.goto();
  await loginPage.loginForm.login({
    username: env.auth.username,
    password: env.auth.password,
  });

  await expect(page).toHaveURL('/');
  await expect(automationPage.customAccountForm.usernameInput).toBeVisible();

  await page.context().storageState({ path: authStoragePath });
});
