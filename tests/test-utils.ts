import { Page } from '@playwright/test';

export async function waitForAppLoad(page: Page) {
  // Wait for the main dashboard to be visible
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
}