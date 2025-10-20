# Internationalization (i18n) Guide

This directory contains the internationalization setup for the Grant Platform API.

## Overview

The API uses [i18next](https://www.i18next.com/) for internationalization, providing localized error messages and responses based on the client's `Accept-Language` header.

## Supported Locales

- `en` - English (default)
- `de` - German (Deutsch)

## Directory Structure

```
i18n/
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   └── errors.json
│   └── de/
│       ├── common.json
│       └── errors.json
├── config.ts      # i18n initialization and configuration
├── helpers.ts     # Translation helper functions
├── index.ts       # Public API exports
└── README.md      # This file
```

## Configuration

i18n configuration is stored in `/src/config/env.config.ts`:

```typescript
export const I18N_CONFIG = {
  supportedLocales: ['en', 'de'] as const,
  defaultLocale: 'en',
  debug: false, // true in development
};
```

Environment variables:

- `I18N_DEFAULT_LOCALE` - Default locale (default: `en`)
- `I18N_DEBUG` - Enable debug logging (default: `false` in production)

## Translation Files

Translation files are organized by namespace:

### `errors.json`

Contains all error messages:

- `auth.*` - Authentication errors
- `validation.*` - Validation errors
- `notFound.*` - Not found errors
- `conflict.*` - Conflict errors
- `common.*` - Common errors

### `common.json`

Contains common translations:

- `success.*` - Success messages
- `actions.*` - Action labels

## Usage

### In Request Handlers

Use the `translateError` helper to translate `ApiError` instances:

```typescript
import { translateError } from '@/i18n';
import { AuthenticationError } from '@/lib/errors';

// Throw error with translation key
throw new AuthenticationError(
  'Invalid credentials', // Fallback English message
  'errors:auth.invalidCredentials' // Translation key
);

// In error handler
const localizedMessage = translateError(req, error);
```

### In Services/Handlers

When throwing errors, always provide:

1. A fallback English message
2. A translation key
3. Optional interpolation parameters

```typescript
// Simple error
throw new NotFoundError('User not found', 'errors:notFound.user');

// With interpolation
throw new NotFoundError(
  `Invitation with id ${invitationId} not found`,
  'errors:notFound.invitation',
  { id: invitationId }
);
```

### Translation Keys

Translation keys use the format: `namespace:path.to.key`

Examples:

- `errors:auth.invalidCredentials`
- `errors:notFound.user`
- `errors:validation.required`
- `common:success.created`

### Interpolation

Use double curly braces for variable interpolation:

**Translation file:**

```json
{
  "notFound": {
    "invitation": "Invitation with ID {{id}} not found"
  }
}
```

**Usage:**

```typescript
throw new NotFoundError(
  `Invitation with id ${invitationId} not found`,
  'errors:notFound.invitation',
  { id: invitationId }
);
```

### Direct Translation (without Request)

For background jobs or non-HTTP contexts:

```typescript
import { translateStatic } from '@/i18n';

const message = translateStatic(
  'errors:auth.invalidCredentials',
  'de' // Specific locale
);
```

### Get Current Locale

```typescript
import { getLocale } from '@/i18n';

const locale = getLocale(req);
console.log(`Request locale: ${locale}`); // "en" or "de"
```

## Error Classes with i18n

All error classes support translation keys:

```typescript
// AuthenticationError
throw new AuthenticationError(
  message,
  translationKey?,
  translationParams?,
  extensions?
);

// NotFoundError
throw new NotFoundError(
  message,
  translationKey?,
  translationParams?,
  extensions?
);

// ValidationError
throw new ValidationError(
  message,
  errors[],
  translationKey?,
  translationParams?,
  extensions?
);

// ConflictError, BadRequestError, AuthorizationError
// All follow the same pattern
```

## Adding New Translations

### 1. Add to English File

`locales/en/errors.json`:

```json
{
  "myModule": {
    "myError": "Something went wrong with {{resource}}"
  }
}
```

### 2. Add to German File

`locales/de/errors.json`:

```json
{
  "myModule": {
    "myError": "Etwas ist schief gelaufen mit {{resource}}"
  }
}
```

### 3. Use in Code

```typescript
throw new ApiError('Something went wrong with resource', {
  statusCode: 500,
  code: 'MY_ERROR',
  translationKey: 'errors:myModule.myError',
  translationParams: { resource: 'User Profile' },
});
```

## Adding New Locales

To add support for a new locale (e.g., French):

### 1. Update Config

`src/config/env.config.ts`:

```typescript
export const I18N_CONFIG = {
  supportedLocales: ['en', 'de', 'fr'] as const,
  // ...
};
```

### 2. Create Translation Files

```bash
mkdir -p src/i18n/locales/fr
touch src/i18n/locales/fr/errors.json
touch src/i18n/locales/fr/common.json
```

### 3. Add Translations

Copy from `en/*.json` and translate each string.

### 4. Update Type Definitions

`src/i18n/config.ts`:

```typescript
export const supportedLocales = ['en', 'de', 'fr'] as const;
```

### 5. Update Web App

`apps/web/i18n/routing.ts`:

```typescript
export const locales = ['en', 'de', 'fr'] as const;
```

`apps/web/lib/apollo-client.ts`:

```typescript
return ['en', 'de', 'fr'].includes(locale) ? locale : 'en';
```

## Client-Side Integration

The web app automatically sends the `Accept-Language` header:

```typescript
// apps/web/lib/apollo-client.ts
const authLink = setContext((_, { headers }) => {
  const locale = getCurrentLocale(); // Gets locale from URL

  return {
    headers: {
      ...headers,
      'accept-language': locale, // API uses this for i18n
    },
  };
});
```

## Testing

### Manual Testing

1. Start the API server
2. Send requests with different `Accept-Language` headers:

```bash
# English (default)
curl -H "Accept-Language: en" http://localhost:4000/api/users/invalid-id

# German
curl -H "Accept-Language: de" http://localhost:4000/api/users/invalid-id
```

### Unit Tests

```typescript
import { translateStatic } from '@/i18n';

describe('i18n', () => {
  it('should translate to English', () => {
    const message = translateStatic('errors:auth.invalidCredentials', 'en');
    expect(message).toBe('Invalid email or password');
  });

  it('should translate to German', () => {
    const message = translateStatic('errors:auth.invalidCredentials', 'de');
    expect(message).toBe('Ungültige E-Mail oder Passwort');
  });
});
```

## Best Practices

### 1. Always Provide Fallback Messages

```typescript
// ✅ Good
throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');

// ❌ Bad - no fallback
throw new AuthenticationError('', 'errors:auth.invalidCredentials');
```

### 2. Use Specific Translation Keys

```typescript
// ✅ Good
'errors:auth.invalidCredentials';

// ❌ Bad - too generic
'errors:invalid';
```

### 3. Keep Translations Consistent

- Use the same tone across all messages
- Be specific and actionable
- Avoid technical jargon when possible

### 4. Organize by Domain

```json
{
  "auth": { ... },
  "validation": { ... },
  "notFound": { ... }
}
```

### 5. Use Interpolation for Dynamic Content

```typescript
// ✅ Good
throw new NotFoundError(`User ${userId} not found`, 'errors:notFound.user', { userId });

// ❌ Bad - hardcoded values
throw new NotFoundError(`User ${userId} not found`);
```

## Troubleshooting

### Translation Key Not Found

If you see the key itself instead of the translation:

- Check that the key exists in the locale file
- Verify the namespace separator (`:`)
- Ensure the locale file is valid JSON

### Wrong Locale Being Used

- Check the `Accept-Language` header is being sent
- Verify middleware order (i18nMiddleware should come early)
- Check that the locale is in the supported list

### Interpolation Not Working

- Verify parameter names match between code and JSON
- Check for typos in variable names
- Ensure double curly braces: `{{variable}}`

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [i18next-http-middleware](https://github.com/i18next/i18next-http-middleware)
- [i18next-fs-backend](https://github.com/i18next/i18next-fs-backend)
- [next-intl Documentation](https://next-intl-docs.vercel.app/) (for web app)
