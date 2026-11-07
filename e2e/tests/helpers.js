import { expect } from '@playwright/test';

const WIREMOCK = 'http://localhost:8089/__admin';

// A fresh user per test keeps the tests independent: every todo belongs to its owner.
export function uniqueUser(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Signs in through the fake OpenID Connect provider, the same redirects a Google login makes.
export async function login(page, username) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Logga in med Google' }).click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('textarea[name="claims"]').fill(JSON.stringify({
    email: `${username}@example.com`,
    name: `Testperson ${username}`,
  }));
  await page.getByRole('button', { name: 'Sign-in' }).click();
  await expect(page.getByRole('button', { name: 'Logga ut' })).toBeVisible();
}

export async function resetGoogleRequests(request) {
  await request.delete(`${WIREMOCK}/requests`);
}

// Requests the backend sent to the fake Google, Ollama or Whisper since the last reset.
export async function sentRequests(request, method, urlPathPattern) {
  const response = await request.post(`${WIREMOCK}/requests/find`, {
    data: { method, urlPathPattern },
  });
  const { requests } = await response.json();
  return requests.map(entry => ({
    url: entry.url,
    body: entry.body ? safeJson(entry.body) : null,
  }));
}

function safeJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
