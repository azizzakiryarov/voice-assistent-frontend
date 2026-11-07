import { test, expect } from '@playwright/test';
import { login, resetGoogleRequests, sentRequests, uniqueUser } from './helpers';

// Headless Chromium does not render audio reliably (on macOS a tone records as 0 bytes), so the
// test replaces the browser's recording layer: the microphone and MediaRecorder hand the app a
// short recording. Everything after that runs for real: upload, Whisper, interpretation, review,
// approval and the mirror to Google Tasks. The browser's own audio capture is not covered.
async function useRecordedAudio(page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => new MediaStream();
    window.MediaRecorder = class {
      static isTypeSupported(type) {
        return type === 'audio/webm';
      }

      constructor(_stream, options) {
        this.mimeType = options?.mimeType || 'audio/webm';
        this.state = 'inactive';
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        const recording = new Blob([new Uint8Array(2048).fill(1)], { type: this.mimeType });
        this.ondataavailable?.({ data: recording });
        this.onstop?.();
      }
    };
  });
}

test('ett röstkommando granskas, godkänns och blir en uppgift i Google Tasks', async ({ page, request }) => {
  await resetGoogleRequests(request);
  await useRecordedAudio(page);
  await login(page, uniqueUser('rost'));

  await page.getByRole('button', { name: 'Spela in röstkommando' }).click();
  await expect(page.getByText('Spelar in...')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Stoppa inspelning' }).click();

  // Whisper transcribes, Ollama interprets, and nothing is saved before approval.
  await expect(page.getByRole('heading', { name: 'Granska röstkommando' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Lägg till att köpa mjölk')).toBeVisible();
  await expect(page.getByPlaceholder('Beskrivning')).toHaveValue('Köpa mjölk');
  expect(await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks')).toHaveLength(0);
  const [whisper] = await sentRequests(request, 'POST', '/whisper/v1/audio/transcriptions');
  expect(whisper).toBeTruthy();

  await page.getByRole('button', { name: 'Godkänn', exact: true }).click();
  await expect(page.getByText('Att göra-post har sparats')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Köpa mjölk' })).toBeVisible();
  const created = await sentRequests(request, 'POST', '/tasks/v1/lists/@default/tasks');
  expect(created.map(entry => entry.body.title)).toEqual(['Köpa mjölk']);
});
