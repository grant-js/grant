/**
 * Supertest-based HTTP client for E2E tests.
 *
 * Wraps supertest in base-URL mode so every request targets the real API
 * container at E2E_API_BASE_URL (e.g. http://localhost:4000).
 */
import supertest from 'supertest';

/** Create a supertest agent targeting the E2E API base URL. */
export function apiClient(): supertest.Agent {
  const baseUrl = process.env.E2E_API_BASE_URL ?? 'http://localhost:4000';
  return supertest.agent(baseUrl);
}
