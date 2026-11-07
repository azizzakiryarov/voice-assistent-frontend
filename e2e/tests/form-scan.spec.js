import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { login, resetGoogleRequests, sentRequests, uniqueUser } from './helpers';

function hasTesseract() {
  try {
    execFileSync('tesseract', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('ett fotat formulär läses med OCR och blir förslag som kan godkännas', async ({ page, browser, request }) => {
  test.skip(!hasTesseract(), 'Tesseract is not installed');
  await resetGoogleRequests(request);

  // Render a "paper form" and photograph it, so no binary fixture is needed.
  const formPage = await browser.newPage({ viewport: { width: 900, height: 500 } });
  await formPage.setContent(`
    <body style="background:#fff;font:32px Arial;padding:40px">
      <p>School permission form</p>
      <p>Parent meeting 15 March 2027 at 18:00</p>
      <p>Return this form by 10 March 2027</p>
    </body>`);
  const photo = await formPage.screenshot({ type: 'png' });
  await formPage.close();

  await login(page, uniqueUser('formular'));
  await page.locator('input[type="file"]').setInputFiles({ name: 'formular.png', mimeType: 'image/png', buffer: photo });
  await expect(page.getByAltText('Förhandsvisning av valt formulär')).toBeVisible();
  await page.getByRole('button', { name: 'Analysera bild' }).click();

  await page.getByText('Visa OCR-text').click({ timeout: 60000 });
  await expect(page.getByText(/Parent meeting/)).toBeVisible();
  await page.getByRole('button', { name: /Godkänn \d+ förslag/ }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Lämna in blanketten' })).toBeVisible();

  expect(await sentRequests(request, 'POST', '/calendar-api/calendar/v3/calendars/primary/events')).toHaveLength(1);
  expect(await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks')).toHaveLength(1);
});
