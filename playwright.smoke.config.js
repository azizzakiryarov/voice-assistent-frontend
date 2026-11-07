import { defineConfig, devices } from '@playwright/test';

// Smoke test of the published site. It never signs in, so it creates nothing in Google.
export default defineConfig({
  testDir: 'e2e/smoke',
  workers: 1,
  retries: 1,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'https://voice-assistant.duckdns.org',
    locale: 'sv-SE',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
