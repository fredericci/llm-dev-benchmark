import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
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
}

test.describe('j27 - Avatar Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('shows login link when not authenticated', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header, nav, [role="banner"]');
    const loginLink = header.getByText(/login/i).or(
      page.getByRole('link', { name: /login|sign in/i })
    );

    await expect(loginLink).toBeVisible({ timeout: 5000 });
  });

  test('shows avatar after login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Login link should NOT be visible
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    await expect(loginLink).not.toBeVisible({ timeout: 5000 });

    // Some avatar element should be visible (button with image, initials, or avatar indicator)
    const avatarButton = page.getByRole('button').filter({ has: page.locator('img') }).or(
      page.locator('[aria-label*="avatar" i], [aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]')
    ).or(
      page.getByRole('button', { name: /avatar|user|profile|account|admin/i })
    );

    await expect(avatarButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('avatar dropdown opens with user info', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Find and click the avatar button
    const avatarButton = page.getByRole('button').filter({ has: page.locator('img') }).or(
      page.locator('[aria-label*="avatar" i], [aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]')
    ).or(
      page.getByRole('button', { name: /avatar|user|profile|account|admin/i })
    );

    await avatarButton.first().click();

    // Expect a dropdown menu to appear
    const dropdown = page.getByRole('menu').or(
      page.locator('[role="menu"], [role="listbox"]')
    );
    await expect(dropdown.first()).toBeVisible({ timeout: 5000 });

    // Expect user name or email in the dropdown
    const userInfo = page.getByText('Admin User').or(
      page.getByText('admin@example.com')
    );
    await expect(userInfo.first()).toBeVisible({ timeout: 5000 });
  });

  test('logout clears session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Click the avatar button
    const avatarButton = page.getByRole('button').filter({ has: page.locator('img') }).or(
      page.locator('[aria-label*="avatar" i], [aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]')
    ).or(
      page.getByRole('button', { name: /avatar|user|profile|account|admin/i })
    );

    await avatarButton.first().click();

    // Click the logout button/link
    const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i }).or(
      page.getByRole('button', { name: /logout|sign out/i })
    ).or(
      page.getByText(/logout|sign out/i)
    );

    await logoutButton.first().click();

    // Login link should be visible again
    const loginLink = page.getByRole('link', { name: /login|sign in/i }).or(
      page.getByText(/login/i)
    );
    await expect(loginLink.first()).toBeVisible({ timeout: 5000 });

    // localStorage should be cleared of auth tokens
    const token = await page.evaluate(() => {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('jwt')
      );
    });
    expect(token).toBeFalsy();
  });

  test('clicking outside closes dropdown', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Click the avatar button
    const avatarButton = page.getByRole('button').filter({ has: page.locator('img') }).or(
      page.locator('[aria-label*="avatar" i], [aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]')
    ).or(
      page.getByRole('button', { name: /avatar|user|profile|account|admin/i })
    );

    await avatarButton.first().click();

    // Verify dropdown is open
    const dropdown = page.getByRole('menu').or(
      page.locator('[role="menu"], [role="listbox"]')
    );
    await expect(dropdown.first()).toBeVisible({ timeout: 5000 });

    // Click outside the dropdown
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Dropdown should be closed
    await expect(dropdown.first()).not.toBeVisible({ timeout: 5000 });
  });
});
