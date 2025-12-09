import { test, expect } from '@playwright/test';

let testUser;

test.describe('Auth Flow (Signup & Login)', () => {
  const signupURL = '/signup';
  const loginURL = '/login';

  test.beforeAll(() => {
    const randomId = Math.floor(Math.random() * 100000);
    testUser = {
      name: `Test User ${randomId}`,
      email: `testuser${randomId}@example.com`,
      password: 'password123',
    };
  });

  // SIGNUP TESTS
  test('Signup page should render correctly', async ({ page }) => {
    await page.goto(signupURL);
    await expect(page.locator('h2')).toHaveText('Create an account');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign up');
  });

  test('Signup form should show validation errors when fields are empty', async ({ page }) => {
    await page.goto(signupURL);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('Should signup a new user successfully', async ({ page }) => {
    await page.goto(signupURL);
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    const loginHeading = page.locator('h2', { hasText: 'Login' });
    await expect(loginHeading).toBeVisible({ timeout: 10000 });
  });

  // LOGIN TESTS
  test('Login page should render correctly', async ({ page }) => {
    await page.goto(loginURL);
    await expect(page.locator('h2')).toHaveText('Login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Login');
  });

  test('Login form should show validation errors when fields are empty', async ({ page }) => {
    await page.goto(loginURL);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('Login should show server error for invalid credentials', async ({ page }) => {
    await page.goto(loginURL);

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    const serverError = page.locator('div.bg-red-100');
    await expect(serverError).toBeVisible();
    await expect(serverError).toHaveText(/(Invalid credentials|Rate limit)/i);
  });

  test('Should login successfully with the newly signed up user', async ({ page }) => {
    await page.goto(loginURL);

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'Your Dashboard' }))
      .toBeVisible({ timeout: 20000 });
  });

  test('Full flow: Signup a user and then login successfully', async ({ page }) => {
    // Signup
    await page.goto(signupURL);
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    const loginHeading = page.locator('h2', { hasText: 'Login' });
    await expect(loginHeading).toBeVisible({ timeout: 10000 });

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'Your Dashboard' }))
      .toBeVisible({ timeout: 20000 });
  });
});
