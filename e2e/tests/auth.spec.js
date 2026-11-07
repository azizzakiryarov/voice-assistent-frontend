import { test, expect } from '@playwright/test';
import { login, uniqueUser } from './helpers';

test('en ny användare loggar in, ser en tom lista och loggar ut', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Logga in med Google' })).toBeVisible();

  const user = uniqueUser('ny');
  await login(page, user);

  await expect(page.getByText(`Testperson ${user}`)).toBeVisible();
  await expect(page.getByText('Inga att göra-poster ännu')).toBeVisible();

  await page.getByRole('button', { name: 'Logga ut' }).click();
  await expect(page.getByRole('button', { name: 'Logga in med Google' })).toBeVisible();
});

test('en användare ser inte en annan användares uppgifter', async ({ page, browser }) => {
  await login(page, uniqueUser('agare'));
  await page.getByPlaceholder('Lägg till en ny att göra-post...').fill('Privat uppgift');
  await page.getByRole('button', { name: 'Lägg till', exact: true }).click();
  await expect(page.getByText('Privat uppgift')).toBeVisible();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, uniqueUser('annan'));
  await expect(otherPage.getByText('Inga att göra-poster ännu')).toBeVisible();
  await expect(otherPage.getByText('Privat uppgift')).toHaveCount(0);
  await otherContext.close();
});
