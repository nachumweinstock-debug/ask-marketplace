import { expect, test } from '@playwright/test';

const ignoredConsolePatterns = [
  /Failed to load resource.*favicon/i,
  /ResizeObserver loop/i,
  /net::ERR_BLOCKED_BY_CLIENT/i,
];

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      errors.push(text);
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.errors, `console/page errors on ${page.url()}`).toEqual([]);
});

test('homepage loads visible content and core CTAs navigate', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Book the person who knows/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Browse listings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Post a service/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /Browse listings/i }).click();
  await expect(page).toHaveURL(/\/browse/);
  await expect(page.getByRole('heading', { name: /Find the right person/i })).toBeVisible();
});

test('navigation, public pages, and support render without a blank screen', async ({ page }) => {
  for (const path of ['/browse', '/support', '/help-wanted', '/legal', '/privacy', '/jacob-feit']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(/We hit a loading problem/i);
  }
});

test('signup and login pages render usable forms', async ({ page }) => {
  await page.goto('/signup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Start typing your university/i)).toBeVisible();

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
});

test('protected pages redirect logged-out users instead of crashing', async ({ page }) => {
  for (const path of ['/account', '/messages', '/dashboard/provider', '/admin/analytics']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  }
});

test('search form validates/navigates and unknown routes are not blank', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/Search Ask Marketplace/i).fill('finance');
  await page.getByRole('button', { name: /^Search$/i }).click();
  await expect(page).toHaveURL(/\/browse\?search=finance/);

  await page.goto('/definitely-not-a-real-page', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('body')).not.toHaveText(/We hit a loading problem/i);
});
