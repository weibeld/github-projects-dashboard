import { test, expect } from '@playwright/test';
import { waitForAppLoad } from '../helpers';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode with search test data
    await page.goto('/?mock-data=/home/runner/work/github-projects-dashboard/github-projects-dashboard/tests/suites/search-data');
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

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should only see 2 projects with "Mem0" in title
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

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should still find the 2 projects
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);
  });

  test('should search for "Mem0" in labels', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('label:mem0');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should see 2 projects with "mem0" label
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
    await page.waitForTimeout(500);

    // Should only see 2 projects
    let projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Clear search
    const clearButton = page.locator('button[title="Clear filter"]');
    await clearButton.click();

    // Wait for filter to clear
    await page.waitForTimeout(500);

    // Should see all 5 projects again
    projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(5);
  });

  test('should show result count when filtering', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('Mem0');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Check result count display
    await expect(page.getByText(/Showing 2 of 5 projects/)).toBeVisible();
    await expect(page.getByText(/3 hidden/)).toBeVisible();
  });

  test('should search with field qualifier "title:Mem0"', async ({ page }) => {
    // Enter search query with field qualifier
    const searchInput = page.locator('input[placeholder*="Filter projects"]');
    await searchInput.fill('title:Mem0');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should only see 2 projects with "Mem0" in title
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(2);

    // Verify the correct projects are shown
    await expect(page.getByText('Mem0 Integration Project')).toBeVisible();
    await expect(page.getByText('Backend API with Mem0')).toBeVisible();
  });
});
