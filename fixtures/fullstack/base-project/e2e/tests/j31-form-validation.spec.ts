import { test, expect } from '@playwright/test';

test.describe('j31 - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('renders contact form', async ({ page }) => {
    await page.goto('/contact');

    const nameInput = page.getByRole('textbox', { name: /name/i }).or(
      page.getByLabel(/name/i)
    );
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByLabel(/email/i)
    );
    const messageInput = page.getByRole('textbox', { name: /message/i }).or(
      page.getByLabel(/message/i)
    ).or(
      page.locator('textarea')
    );
    const submitButton = page.getByRole('button', { name: /submit|send/i });

    await expect(nameInput.first()).toBeVisible({ timeout: 5000 });
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
    await expect(messageInput.first()).toBeVisible({ timeout: 5000 });
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('shows required errors on empty submit', async ({ page }) => {
    await page.goto('/contact');

    const submitButton = page.getByRole('button', { name: /submit|send/i });
    await submitButton.first().click();

    // Expect error messages for required fields
    const requiredErrors = page.getByText(/required/i);
    await expect(requiredErrors.first()).toBeVisible({ timeout: 5000 });

    // Expect multiple required error messages (one for each field)
    const errorCount = await requiredErrors.count();
    expect(errorCount).toBeGreaterThanOrEqual(1);
  });

  test('shows email format error', async ({ page }) => {
    await page.goto('/contact');

    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByLabel(/email/i)
    );

    await emailInput.first().fill('invalid');
    await emailInput.first().blur();

    // May need to trigger validation by clicking submit too
    const submitButton = page.getByRole('button', { name: /submit|send/i });
    await submitButton.first().click();

    const emailError = page.getByText(/valid email|invalid email/i);
    await expect(emailError.first()).toBeVisible({ timeout: 5000 });
  });

  test('shows min length error for message', async ({ page }) => {
    await page.goto('/contact');

    const messageInput = page.getByRole('textbox', { name: /message/i }).or(
      page.getByLabel(/message/i)
    ).or(
      page.locator('textarea')
    );

    await messageInput.first().fill('short');
    await messageInput.first().blur();

    // May need to trigger validation by clicking submit too
    const submitButton = page.getByRole('button', { name: /submit|send/i });
    await submitButton.first().click();

    const lengthError = page.getByText(/at least 10|minimum|too short|characters/i);
    await expect(lengthError.first()).toBeVisible({ timeout: 5000 });
  });

  test('successful submission shows success message', async ({ page }) => {
    await page.goto('/contact');

    const nameInput = page.getByRole('textbox', { name: /name/i }).or(
      page.getByLabel(/name/i)
    );
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByLabel(/email/i)
    );
    const messageInput = page.getByRole('textbox', { name: /message/i }).or(
      page.getByLabel(/message/i)
    ).or(
      page.locator('textarea')
    );
    const submitButton = page.getByRole('button', { name: /submit|send/i });

    await nameInput.first().fill('John Doe');
    await emailInput.first().fill('john@example.com');
    await messageInput.first().fill('This is a test message that is long enough');
    await submitButton.first().click();

    const successMessage = page.getByText(/sent|success|thank/i);
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('clears form after success', async ({ page }) => {
    await page.goto('/contact');

    const nameInput = page.getByRole('textbox', { name: /name/i }).or(
      page.getByLabel(/name/i)
    );
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByLabel(/email/i)
    );
    const messageInput = page.getByRole('textbox', { name: /message/i }).or(
      page.getByLabel(/message/i)
    ).or(
      page.locator('textarea')
    );
    const submitButton = page.getByRole('button', { name: /submit|send/i });

    await nameInput.first().fill('John Doe');
    await emailInput.first().fill('john@example.com');
    await messageInput.first().fill('This is a test message that is long enough');
    await submitButton.first().click();

    // Wait for success message
    const successMessage = page.getByText(/sent|success|thank/i);
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });

    // Expect form inputs to be cleared
    await expect(nameInput.first()).toHaveValue('', { timeout: 5000 });
    await expect(emailInput.first()).toHaveValue('', { timeout: 5000 });
    await expect(messageInput.first()).toHaveValue('', { timeout: 5000 });
  });
});
