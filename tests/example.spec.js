// tests/example.spec.js
import { test, expect } from '@playwright/test';

test('home page has title', async ({ page }) => {
  await page.goto('/'); // baseURL is set in config
  await expect(page).toHaveTitle(/Blog/i);
});
