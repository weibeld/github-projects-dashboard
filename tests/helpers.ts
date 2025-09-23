import { Page } from '@playwright/test';

export async function waitForAppLoad(page: Page) {
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
}
