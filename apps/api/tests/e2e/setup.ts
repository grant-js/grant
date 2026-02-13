/**
 * E2E test setup – runs once before the entire suite.
 *
 * - Loads .env.e2e (host-side env for DB helpers and base URL)
 * - Validates that E2E_API_BASE_URL is set
 * - Waits for the API health endpoint to respond 200
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.e2e from the monorepo root (two levels up from apps/api)
config({ path: resolve(__dirname, '../../../../.env.e2e') });

// Fallback defaults matching docker-compose.e2e.yml
const BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:4000';
const DB_URL =
  process.env.E2E_DB_URL ?? 'postgresql://grant_user:grant_password@localhost:5433/grant_e2e';

// Expose for tests
process.env.E2E_API_BASE_URL = BASE_URL;
process.env.E2E_DB_URL = DB_URL;

async function waitForHealth(url: string, maxRetries = 30, intervalMs = 2_000): Promise<void> {
  const healthUrl = `${url}/health`;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        const body = (await res.json()) as { status: string };
        if (body.status === 'ok') {
          console.log(`✅ API is healthy at ${healthUrl}`);
          return;
        }
      }
    } catch {
      // Connection refused or network error – keep trying
    }
    if (i < maxRetries) {
      console.log(`⏳ Waiting for API health (attempt ${i}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error(`API at ${healthUrl} did not become healthy after ${maxRetries} retries`);
}

// Vitest runs setup files before tests; use beforeAll at file scope
export async function setup() {
  await waitForHealth(BASE_URL);
}

// Also export for use in globalSetup if needed
export default setup;
