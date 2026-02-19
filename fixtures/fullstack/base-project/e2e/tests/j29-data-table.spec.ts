import { test, expect } from '@playwright/test';

test.describe('j29 - Data Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('renders table with user data', async ({ page }) => {
    await page.goto('/users');

    // Expect a table element to be visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Expect column headers for Name, Email, and Role
    const nameHeader = page.getByRole('columnheader', { name: /name/i });
    const emailHeader = page.getByRole('columnheader', { name: /email/i });
    const roleHeader = page.getByRole('columnheader', { name: /role/i });

    await expect(nameHeader).toBeVisible({ timeout: 5000 });
    await expect(emailHeader).toBeVisible({ timeout: 5000 });
    await expect(roleHeader).toBeVisible({ timeout: 5000 });
  });

  test('displays user rows', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to be visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Get all data rows (tbody rows, not header rows)
    const rows = page.getByRole('row').filter({
      hasNot: page.getByRole('columnheader'),
    });

    // Expect at least one data row
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Check that cells in the first data row have content
    const firstRow = rows.first();
    const cells = firstRow.getByRole('cell');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < cellCount; i++) {
      const cellText = await cells.nth(i).textContent();
      expect(cellText?.trim().length).toBeGreaterThan(0);
    }
  });

  test('pagination next/previous', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to be visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Get content of the first page
    const getFirstRowText = async () => {
      const rows = page.getByRole('row').filter({
        hasNot: page.getByRole('columnheader'),
      });
      return rows.first().textContent();
    };

    const firstPageContent = await getFirstRowText();

    // Find and click the Next button
    const nextButton = page.getByRole('button', { name: /next|forward|>/i }).or(
      page.locator('button:has-text("Next"), button:has-text(">"), button:has-text("\\u203A")')
    );
    await expect(nextButton.first()).toBeVisible({ timeout: 5000 });
    await nextButton.first().click();

    // Wait for content to change
    await expect(async () => {
      const secondPageContent = await getFirstRowText();
      expect(secondPageContent).not.toBe(firstPageContent);
    }).toPass({ timeout: 5000 });

    // Find and click the Previous button
    const prevButton = page.getByRole('button', { name: /prev|previous|back|</i }).or(
      page.locator('button:has-text("Previous"), button:has-text("Prev"), button:has-text("<"), button:has-text("\\u2039")')
    );
    await prevButton.first().click();

    // Wait for content to return to original
    await expect(async () => {
      const restoredContent = await getFirstRowText();
      expect(restoredContent).toBe(firstPageContent);
    }).toPass({ timeout: 5000 });
  });

  test('sorting changes order', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to be visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Find the Email column header and click it to sort
    const emailHeader = page.getByRole('columnheader', { name: /email/i });
    await emailHeader.click();

    // Get the first email value after first sort
    const getFirstEmailCell = async () => {
      const rows = page.getByRole('row').filter({
        hasNot: page.getByRole('columnheader'),
      });
      const firstRow = rows.first();
      const cells = firstRow.getByRole('cell');
      // Find the cell that looks like an email
      const cellCount = await cells.count();
      for (let i = 0; i < cellCount; i++) {
        const text = await cells.nth(i).textContent();
        if (text && text.includes('@')) {
          return text.trim();
        }
      }
      return null;
    };

    const firstEmail = await getFirstEmailCell();

    // Click again to reverse sort order
    await emailHeader.click();

    // Wait for sort to take effect and verify order changed
    await expect(async () => {
      const secondEmail = await getFirstEmailCell();
      expect(secondEmail).not.toBe(firstEmail);
    }).toPass({ timeout: 5000 });
  });

  test('shows total count', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to be visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Expect some text near pagination showing a number (total count, page indicator, etc.)
    const countText = page.getByText(/\d+/).or(
      page.getByText(/page\s+\d+/i)
    ).or(
      page.getByText(/showing/i)
    ).or(
      page.getByText(/total/i)
    ).or(
      page.getByText(/of\s+\d+/i)
    );

    await expect(countText.first()).toBeVisible({ timeout: 5000 });
  });
});
