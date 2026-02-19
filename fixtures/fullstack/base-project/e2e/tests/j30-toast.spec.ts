import { test, expect } from '@playwright/test';

test.describe('j30 - Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('success toast appears', async ({ page }) => {
    await page.goto('/');

    const successButton = page.getByRole('button', { name: /show success/i }).or(
      page.getByText(/show success/i)
    );
    await successButton.first().click();

    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    const toastText = page.getByText('Operation completed successfully');
    await expect(toastText).toBeVisible({ timeout: 5000 });
  });

  test('error toast appears', async ({ page }) => {
    await page.goto('/');

    const errorButton = page.getByRole('button', { name: /show error/i }).or(
      page.getByText(/show error/i)
    );
    await errorButton.first().click();

    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    const toastText = page.getByText('Something went wrong');
    await expect(toastText).toBeVisible({ timeout: 5000 });
  });

  test('info toast appears', async ({ page }) => {
    await page.goto('/');

    const infoButton = page.getByRole('button', { name: /show info/i }).or(
      page.getByText(/show info/i)
    );
    await infoButton.first().click();

    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    const toastText = page.getByText('Here is some information');
    await expect(toastText).toBeVisible({ timeout: 5000 });
  });

  test('toast has distinct colors', async ({ page }) => {
    await page.goto('/');

    // Show success toast
    const successButton = page.getByRole('button', { name: /show success/i }).or(
      page.getByText(/show success/i)
    );
    await successButton.first().click();

    // Wait for toast to appear
    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    // Check that success toast has a greenish background
    const bgColor = await toast.first().evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.backgroundColor;
    });

    // Parse the RGB values
    const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(rgbMatch).toBeTruthy();

    if (rgbMatch) {
      const red = parseInt(rgbMatch[1], 10);
      const green = parseInt(rgbMatch[2], 10);
      // For a green-ish color, green channel should be greater than red channel
      expect(green).toBeGreaterThan(red);
    }
  });

  test('toast can be dismissed', async ({ page }) => {
    await page.goto('/');

    // Show a toast
    const successButton = page.getByRole('button', { name: /show success/i }).or(
      page.getByText(/show success/i)
    );
    await successButton.first().click();

    // Wait for toast to appear
    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    // Find and click the close/dismiss button
    const closeButton = toast.first().getByRole('button', { name: /close|dismiss/i }).or(
      toast.first().locator('button[aria-label*="close" i], button[aria-label*="dismiss" i]')
    ).or(
      toast.first().locator('button')
    );
    await closeButton.first().click();

    // Toast should be removed
    await expect(toast.first()).not.toBeVisible({ timeout: 5000 });
  });

  test('toast auto-dismisses', async ({ page }) => {
    await page.goto('/');

    // Show a toast
    const successButton = page.getByRole('button', { name: /show success/i }).or(
      page.getByText(/show success/i)
    );
    await successButton.first().click();

    // Wait for toast to appear
    const toast = page.getByRole('alert').or(page.getByRole('status')).or(
      page.locator('[role="alert"], [role="status"]')
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    // Wait for auto-dismiss (~6 seconds)
    await page.waitForTimeout(6000);

    // Toast should no longer be visible
    await expect(toast.first()).not.toBeVisible({ timeout: 5000 });
  });
});
