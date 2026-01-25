import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});

// Mock window.location for redirect tests
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});
