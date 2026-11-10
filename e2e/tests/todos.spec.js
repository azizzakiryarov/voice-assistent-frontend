import { test, expect } from '@playwright/test';
import { login, resetGoogleRequests, sentRequests, uniqueUser } from './helpers';

test.beforeEach(async ({ page, request }) => {
  await resetGoogleRequests(request);
  await login(page, uniqueUser('todo'));
});

test('skapa, klarmarkera och radera en uppgift speglas till Google Tasks', async ({ page, request }) => {
  await page.getByPlaceholder('Lägg till en ny att göra-post...').fill('Köp kaffe');
  await page.getByRole('button', { name: 'Lägg till', exact: true }).click();

  const task = page.getByRole('listitem').filter({ hasText: 'Köp kaffe' });
  await expect(task).toBeVisible();
  await expect(task).toContainText('Synkad med Google Tasks');
  const created = await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks');
  expect(created).toHaveLength(1);
  expect(created[0].body).toMatchObject({ title: 'Köp kaffe', status: 'needsAction' });

  await task.getByRole('checkbox', { name: 'Markera som slutförd' }).click();
  await expect(page.getByText('Slutförda (1)')).toBeVisible();
  await expect.poll(async () => (await sentRequests(request, 'PUT', '/tasks/v1/lists/.+/tasks/created-.+')).length)
    .toBe(1);
  const [updated] = await sentRequests(request, 'PUT', '/tasks/v1/lists/.+/tasks/created-.+');
  expect(updated.body).toMatchObject({ title: 'Köp kaffe', status: 'completed' });

  await page.getByRole('listitem').filter({ hasText: 'Köp kaffe' })
    .getByRole('button', { name: 'Ta bort task', exact: true }).click();
  await expect(page.getByText('Köp kaffe')).toHaveCount(0);
  await expect.poll(async () => (await sentRequests(request, 'DELETE', '/tasks/v1/lists/.+/tasks/created-.+')).length)
    .toBe(1);
});

test('synk hämtar nya uppgifter från Google men inte gamla klara eller raderade', async ({ page }) => {
  await page.getByRole('button', { name: 'Synka Google Tasks' }).click();
  await expect(page.getByText('Google Tasks synkade: 1 nya, 0 uppdaterade')).toBeVisible();

  await expect(page.getByText('Uppgift skapad i Google')).toHaveCount(1);
  await expect(page.getByText('Gammal klar uppgift')).toHaveCount(0);
  await expect(page.getByText('Raderad i Google')).toHaveCount(0);

  // A second sync updates the same task instead of importing a duplicate.
  await page.getByRole('button', { name: 'Synka Google Tasks' }).click();
  await expect(page.getByText('Google Tasks synkade: 0 nya, 1 uppdaterade')).toBeVisible();
  await expect(page.getByText('Uppgift skapad i Google')).toHaveCount(1);
});
