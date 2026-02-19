import { test, expect } from '@playwright/test';

test.describe('j26 - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('renders login form', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /login|sign in|submit/i });

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /login|sign in|submit/i });

    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('WrongPassword123!');
    await submitButton.click();

    const errorText = page.getByText(/invalid|error|incorrect|unauthorized|wrong/i);
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });

  test('redirects on successful login', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /login|sign in|submit/i });

    await emailInput.fill('admin@example.com');
    await passwordInput.fill('Admin123!');
    await submitButton.click();

    await expect(async () => {
      expect(page.url()).not.toContain('/login');
    }).toPass({ timeout: 5000 });
  });

  test('stores JWT token after login', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /login|sign in|submit/i });

    await emailInput.fill('admin@example.com');
    await passwordInput.fill('Admin123!');
    await submitButton.click();

    // Wait for redirect away from login
    await expect(async () => {
      expect(page.url()).not.toContain('/login');
    }).toPass({ timeout: 5000 });

    // Check localStorage for JWT token under common key names
    const token = await page.evaluate(() => {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('jwt')
      );
    });

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token!.length).toBeGreaterThan(0);
  });
});
