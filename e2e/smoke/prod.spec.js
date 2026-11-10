import { test, expect } from '@playwright/test';

// Runs against the published site after a deploy. It stops at Google's sign-in page.
test('startsidan laddar och visar inloggning', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Röstassistent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logga in med Google' })).toBeVisible();
});

test('API:t svarar och skyddar data utan inloggning', async ({ request }) => {
  const me = await request.get('/api/voice-assistent/auth/me');
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({ authenticated: false });

  const todos = await request.get('/api/voice-assistent/todos', { maxRedirects: 0 });
  expect([302, 401, 403]).toContain(todos.status());
});

test('inloggningen leder till Google med Tasks och Calendar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Logga in med Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);
  const url = new URL(page.url());
  const scope = url.searchParams.get('scope') || decodeURIComponent(url.search);
  expect(scope).toContain('https://www.googleapis.com/auth/tasks');
  expect(scope).toContain('https://www.googleapis.com/auth/calendar');
});
