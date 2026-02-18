import { test, expect } from '@playwright/test';

test.describe('j28 - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('toggle button visible in header', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: /dark|light|theme|mode/i }).or(
      page.locator('button[aria-label*="dark" i], button[aria-label*="light" i], button[aria-label*="theme" i], button[aria-label*="mode" i]')
    );

    await expect(toggleButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('toggles body background color', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: /dark|light|theme|mode/i }).or(
      page.locator('button[aria-label*="dark" i], button[aria-label*="light" i], button[aria-label*="theme" i], button[aria-label*="mode" i]')
    );

    // Get initial background color
    const initialBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Click the toggle
    await toggleButton.first().click();

    // Get new background color
    const newBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Background color should have changed
    expect(newBg).not.toBe(initialBg);
  });

  test('toggles back to light mode', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: /dark|light|theme|mode/i }).or(
      page.locator('button[aria-label*="dark" i], button[aria-label*="light" i], button[aria-label*="theme" i], button[aria-label*="mode" i]')
    );

    // Get initial background color
    const initialBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Click toggle twice (dark -> light)
    await toggleButton.first().click();
    await page.waitForTimeout(500);
    await toggleButton.first().click();

    // Get background color after two toggles
    const restoredBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Background should match the original
    expect(restoredBg).toBe(initialBg);
  });

  test('persists dark mode preference', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: /dark|light|theme|mode/i }).or(
      page.locator('button[aria-label*="dark" i], button[aria-label*="light" i], button[aria-label*="theme" i], button[aria-label*="mode" i]')
    );

    // Click toggle to dark mode
    await toggleButton.first().click();

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Get the dark background color
    const darkBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Reload the page
    await page.reload();

    // Verify background is still dark
    const bgAfterReload = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bgAfterReload).toBe(darkBg);
  });
});
