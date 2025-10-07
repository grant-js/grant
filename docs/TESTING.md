# Testing Setup

This project uses **Vitest** as the testing framework, which is the modern standard for testing in the Vite/Next.js ecosystem.

## 🚀 Quick Start

### Run Tests

```bash
# Run tests in watch mode (development)
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 📁 Test Structure

```
apps/
├── api/
│   └── tests/                    # API-specific tests
│       └── unit/
│           └── graphql/         # GraphQL-related unit tests
│               ├── field-selection.test.ts
│               └── scalars.test.ts
└── web/
    └── tests/                    # Web app-specific tests (future)
        └── unit/                # Unit tests
            └── components/      # Component tests
```

## 🧪 Test Categories

### Unit Tests (`apps/api/tests/unit/`)

- **Field Selection Tests**: Test the GraphQL field selection optimization utilities
- **Scalar Tests**: Test custom GraphQL scalar implementations (e.g., Date scalar)

### Integration Tests (Future)

- **API Tests**: Test GraphQL endpoints
- **Database Tests**: Test database operations and repositories

## ⚙️ Configuration

### API Tests (`apps/api/vitest.config.ts`)

- **Environment**: `node` for API testing
- **Path Resolution**: Uses `vite-tsconfig-paths` for `@/` imports
- **Coverage**: V8 coverage provider with HTML, JSON, and text reports
- **No Setup Files**: API tests don't need Next.js mocks

### Web Tests (`apps/web/vitest.config.ts`) - Future

- **Environment**: `jsdom` for DOM testing
- **Setup Files**: Will include component testing setup
- **Coverage**: V8 coverage provider

## 📝 Writing Tests

### Test File Naming

- Use `.test.ts` or `.spec.ts` extension
- Place in appropriate subdirectory under `apps/{api|web}/tests/`

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('Method Name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = someFunction(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking

- Use `vi.mock()` for module mocking
- Use `vi.fn()` for function mocking
- Use `vi.spyOn()` for method spying

## 🔧 What Was Removed

### Old Testing Setup

- ❌ **`tsx` dependency**: TypeScript execution runtime (not needed for testing)
- ❌ **`scripts/` directory**: Non-standard manual testing files
- ❌ **Manual curl commands**: Replaced with proper unit tests

### Why These Changes?

- **`tsx`**: Was only used for running manual test scripts
- **Manual scripts**: Not maintainable, no CI/CD integration, hard to debug
- **Non-standard approach**: Made the codebase harder to understand and maintain

## 🎯 Benefits of New Setup

1. **Standard Testing**: Uses industry-standard Vitest framework
2. **CI/CD Ready**: Tests can run in automated pipelines
3. **Maintainable**: Clear test structure and organization
4. **Fast**: Vitest is significantly faster than Jest
5. **Type Safe**: Full TypeScript support with proper type checking
6. **Coverage**: Built-in coverage reporting
7. **UI Testing**: Optional UI for test debugging and exploration

## 🚀 Next Steps

1. **Add More Unit Tests**: Cover all utility functions and components
2. **Integration Tests**: Test GraphQL resolvers and database operations
3. **E2E Tests**: Consider adding Playwright for end-to-end testing
4. **Test Coverage**: Aim for >80% coverage across the codebase
