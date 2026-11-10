import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a local stack: Vite dev server, the backend with the e2e profile and
// the fake services in e2e/compose.yml (start them first with `npm run e2e:services`).
const backendDir = process.env.BACKEND_DIR || '../voice-assistant-backend';

export default defineConfig({
  testDir: 'e2e/tests',
  // The tests share one backend and one WireMock request journal, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: './mvnw -B -ntp -q spring-boot:run',
      cwd: backendDir,
      url: 'http://localhost:8081/api/voice-assistent/auth/me',
      env: {
        SPRING_PROFILES_ACTIVE: 'local,e2e',
        GOOGLE_CALENDAR_CLIENT_ID: 'e2e-client',
        GOOGLE_CALENDAR_CLIENT_SECRET: 'e2e-secret',
      },
      timeout: 240000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
