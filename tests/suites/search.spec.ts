import { test, expect } from '@playwright/test';
import { waitForAppLoad } from '../helpers';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Note: The mock-data path should be adjusted to match your local environment
    // In CI/CD, this would be set via environment variable or test configuration
    // For now, using a placeholder path that should be customized per environment
    const mockDataPath = process.env.MOCK_DATA_PATH || '/path/to/tests/suites/search-data';
    await page.goto(`/?mock-data=${mockDataPath}`);
    await waitForAppLoad(page);
  });

  test('should display all projects initially', async ({ page }) => {
    // Should see all 5 project cards (including closed project)
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(5);
  });

  test('should search for "Mem0" in project titles', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('Mem0');

    // Wait for filtered results using expect with built-in retries
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Verify the correct projects are shown
    await expect(page.getByText('Mem0 Integration Project')).toBeVisible();
    await expect(page.getByText('Backend API with Mem0')).toBeVisible();

    // Verify other projects are not shown
    await expect(page.getByText('React Frontend App')).not.toBeVisible();
    await expect(page.getByText('Python Data Pipeline')).not.toBeVisible();
  });

  test('should search case-insensitively', async ({ page }) => {
    // Enter search query with different case
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('mem0');

    // Wait for filtered results
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);
  });

  test('should search for "Mem0" in labels', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('label:mem0');

    // Wait for filtered results
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Verify the correct projects are shown
    await expect(page.getByText('Mem0 Integration Project')).toBeVisible();
    await expect(page.getByText('Backend API with Mem0')).toBeVisible();
  });

  test('should clear search and show all projects', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('Mem0');

    // Wait for filtered results
    let projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Clear search
    const clearButton = page.locator('button[title="Clear filter"]');
    await clearButton.click();

    // Wait for all projects to be shown again
    await expect(projectCards).toHaveCount(5);
  });

  test('should show result count when filtering', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('Mem0');

    // Check that filtered results are displayed
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Check result count display
    await expect(page.getByText(/Showing 2 of 5 projects/)).toBeVisible();
    await expect(page.getByText(/3 hidden/)).toBeVisible();
  });

  test('should search with field qualifier "title:Mem0"', async ({ page }) => {
    // Enter search query with field qualifier
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('title:Mem0');

    // Wait for filtered results
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Verify the correct projects are shown
    await expect(page.getByText('Mem0 Integration Project')).toBeVisible();
    await expect(page.getByText('Backend API with Mem0')).toBeVisible();
  });
});
