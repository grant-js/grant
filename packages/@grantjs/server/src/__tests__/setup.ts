import { afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
