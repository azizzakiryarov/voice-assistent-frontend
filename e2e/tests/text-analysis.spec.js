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

const GYM_BOOKING = `Hej Aziz.
Här kommer din bokning.
Namn på passet: Sparring all levels
Tidpunkt för passet: 2027-03-20 12:00
Längd på passet: 90 minuter
Hälsningar
Allstars Training Center AB`;

// The fake model answers like llama3.2:1b did in production: the event twice, marked as all-day,
// without an end, plus a todo, an information item and a warning that only repeat it.
test('en bokning med klockslag visar tid och längd och inga upprepningar', async ({ page, request }) => {
  await resetGoogleRequests(request);
  await login(page, uniqueUser('booking'));

  await page.getByPlaceholder('Klistra in mejlet eller texten här...').fill(GYM_BOOKING);
  await page.getByRole('button', { name: 'Analysera text' }).click();

  await expect(page.getByRole('checkbox', { name: 'Heldag' })).toHaveCount(1, { timeout: 30000 });
  await expect(page.getByRole('checkbox', { name: 'Heldag' })).not.toBeChecked();
  await expect(page.getByLabel('Start')).toHaveValue('2027-03-20T12:00');
  await expect(page.getByLabel('Slut')).toHaveValue('2027-03-20T13:30');
  await expect(page.getByText('Vad är det här du ska göra?')).toHaveCount(0);

  await page.getByRole('button', { name: /Godkänn valda \(1\)/ }).click();
  await expect.poll(async () => (await sentRequests(request, 'POST', '/calendar-api/calendar/v3/calendars/primary/events')).length)
    .toBe(1);
  const [event] = await sentRequests(request, 'POST', '/calendar-api/calendar/v3/calendars/primary/events');
  // Compare instants: the Google client writes the time in the JVM's zone, which is UTC in CI.
  expect(new Date(event.body.start.dateTime).toISOString()).toBe(new Date('2027-03-20T12:00:00+01:00').toISOString());
  expect(new Date(event.body.end.dateTime).toISOString()).toBe(new Date('2027-03-20T13:30:00+01:00').toISOString());
  expect(await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks')).toHaveLength(0);
});
