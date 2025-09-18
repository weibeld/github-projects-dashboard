import { test, expect } from '@playwright/test';
import { waitForAppLoad, loadMockData, setMockData } from '../helpers';

test.describe('Pretest', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode - bypasses authentication and loads mock data
    await page.goto('/?test=true');
    await waitForAppLoad(page);
  });

  test('should display the GitHub Projects Dashboard', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('GitHub Projects Dashboard');

    // Check main heading
    await expect(page.getByText('GitHub Projects Dashboard')).toBeVisible();
  });

  test('should display mock columns', async ({ page }) => {
    // Should see the 4 mock columns
    await expect(page.getByText('No Status')).toBeVisible();
    await expect(page.getByText('Test Column 1')).toBeVisible();
    await expect(page.getByText('Test Column 2')).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Closed' })).toBeVisible();
  });

  test('should display mock project cards', async ({ page }) => {
    // Should see project cards (3 mock projects)
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(3);
  });
});