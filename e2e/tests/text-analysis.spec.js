import { test, expect } from '@playwright/test';
import { login, resetGoogleRequests, sentRequests, uniqueUser } from './helpers';

const SCHOOL_EMAIL = `Hej!
Föräldramöte 15 mars 2027 klockan 18-19 i aulan.
Lämna in blanketten senast 10 mars 2027.
Hälsningar, skolan`;

test('ett inklistrat mejl blir en kalenderhändelse och en uppgift efter godkännande', async ({ page, request }) => {
  await resetGoogleRequests(request);
  await login(page, uniqueUser('text'));

  await page.getByPlaceholder('Rubrik eller källa, t.ex. Mejl från skolan').fill('Mejl från skolan');
  await page.getByPlaceholder('Klistra in mejlet eller texten här...').fill(SCHOOL_EMAIL);
  await page.getByRole('button', { name: 'Analysera text' }).click();

  // The analysis runs as a background job that the page polls every five seconds.
  await expect(page.getByText('Föräldramöte').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Lämna in blanketten').first()).toBeVisible();
  expect(await sentRequests(request, 'POST', '/calendar-api/.*')).toHaveLength(0);

  await page.getByRole('button', { name: /Godkänn valda \(2\)/ }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Lämna in blanketten' })).toBeVisible();

  const events = await sentRequests(request, 'POST', '/calendar-api/calendar/v3/calendars/primary/events');
  expect(events).toHaveLength(1);
  expect(events[0].body.summary).toBe('Föräldramöte');
  const tasks = await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks');
  expect(tasks.map(entry => entry.body.title)).toEqual(['Lämna in blanketten']);
});
