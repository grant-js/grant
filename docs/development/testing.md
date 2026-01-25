---
title: Testing
description: Testing setup and best practices for Grant
---

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

## Testing Best Practices

### Unit Testing

1. **Test Behavior, Not Implementation**:
   - Focus on what the function does, not how it does it
   - Test inputs and expected outputs
   - Avoid testing internal implementation details

2. **Use Descriptive Test Names**:

   ```typescript
   // Good
   it('should return user data when valid ID is provided', () => {
     // test implementation
   });

   // Bad
   it('should work', () => {
     // test implementation
   });
   ```

3. **Follow AAA Pattern**:

   ```typescript
   it('should calculate total price correctly', () => {
     // Arrange
     const items = [{ price: 10 }, { price: 20 }];
     const taxRate = 0.1;

     // Act
     const total = calculateTotal(items, taxRate);

     // Assert
     expect(total).toBe(33);
   });
   ```

### Integration Testing

1. **Test API Endpoints**:

   ```typescript
   describe('User API', () => {
     it('should create a new user', async () => {
       const userData = { name: 'John', email: 'john@example.com' };

       const response = await request(app)
         .post('/graphql')
         .send({
           query: `
             mutation CreateUser($input: CreateUserInput!) {
               createUser(input: $input) {
                 id
                 name
                 email
               }
             }
           `,
           variables: { input: userData },
         });

       expect(response.status).toBe(200);
       expect(response.body.data.createUser).toMatchObject(userData);
     });
   });
   ```

2. **Test Database Operations**:

   ```typescript
   describe('User Repository', () => {
     it('should save user to database', async () => {
       const userData = { name: 'John', email: 'john@example.com' };

       const user = await userRepository.create(userData);

       expect(user.id).toBeDefined();
       expect(user.name).toBe(userData.name);
       expect(user.email).toBe(userData.email);
     });
   });
   ```

### Component Testing

1. **Test User Interactions**:

   ```typescript
   import { render, screen, fireEvent } from '@testing-library/react';
   import { UserForm } from './UserForm';

   describe('UserForm', () => {
     it('should submit form with valid data', () => {
       const onSubmit = vi.fn();

       render(<UserForm onSubmit={onSubmit} />);

       fireEvent.change(screen.getByLabelText('Name'), {
         target: { value: 'John Doe' }
       });
       fireEvent.change(screen.getByLabelText('Email'), {
         target: { value: 'john@example.com' }
       });
       fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

       expect(onSubmit).toHaveBeenCalledWith({
         name: 'John Doe',
         email: 'john@example.com'
       });
     });
   });
   ```

2. **Test Error States**:

   ```typescript
   it('should display error message for invalid email', () => {
     render(<UserForm />);

     fireEvent.change(screen.getByLabelText('Email'), {
       target: { value: 'invalid-email' }
     });
     fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

     expect(screen.getByText('Invalid email format')).toBeInTheDocument();
   });
   ```

## Coverage Goals

- **Unit Tests**: >90% coverage for utility functions and business logic
- **Integration Tests**: >80% coverage for API endpoints and database operations
- **Component Tests**: >70% coverage for UI components
- **Overall**: >80% coverage across the entire codebase

---

**Next:** Learn about [Contributing](/development/contributing) to understand how to contribute to the project.
