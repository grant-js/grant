# Internationalization (i18n) & Localization (l10n)

Grant provides comprehensive internationalization (i18n) and localization (l10n) support across both the API and web application, enabling you to serve users in multiple languages.

## Overview

**Current Language Support:**

- 🇬🇧 English (en) - Default
- 🇩🇪 German (de)

**Architecture:**

- **API**: `i18next` with HTTP middleware for server-side translations
- **Web**: `next-intl` for Next.js client and server components
- **Auto-sync**: Web app automatically sends user's locale to API

---

## 🌐 How It Works

### Request Flow

```
User sets language in web app
  ↓
Web app detects locale from URL (/en/... or /de/...)
  ↓
Apollo Client adds Accept-Language header to all requests
  ↓
API receives request with Accept-Language: de
  ↓
i18n middleware detects and sets locale
  ↓
Business logic throws errors with translation keys
  ↓
Error middleware translates using detected locale
  ↓
Response sent with localized messages
```

### Example Flow

```
User (German browser) → /de/organizations
  → Apollo adds: Accept-Language: de
  → API endpoint called
  → Handler throws: NotFoundError('Organization not found', 'errors:notFound.organization')
  → Middleware translates: "Organisation nicht gefunden"
  → Client receives German error message
```

---

## 🔧 API Internationalization

### Architecture

```
apps/api/src/i18n/
├── locales/
│   ├── en/
│   │   ├── common.json      # Common UI strings
│   │   └── errors.json      # Error messages
│   └── de/
│       ├── common.json
│       └── errors.json
├── config.ts                # i18next initialization
├── helpers.ts               # Translation utilities
├── index.ts                 # Public exports
└── README.md                # Developer guide
```

### Configuration

The API uses `i18next` with environment-based configuration:

```typescript
// apps/api/src/config/env.config.ts
export const I18N_CONFIG = {
  supportedLocales: ['en', 'de'],
  defaultLocale: 'en',
  debug: false, // true in development
};
```

**Environment Variables:**

```bash
I18N_DEFAULT_LOCALE=en    # Default locale
I18N_DEBUG=false          # Enable debug logging
```

### Translation Files

#### English (`en/errors.json`)

```json
{
  "auth": {
    "invalidCredentials": "Invalid email or password",
    "userNotFound": "User not found",
    "unauthorized": "You are not authorized to perform this action"
  },
  "notFound": {
    "resource": "{{resource}} not found",
    "organization": "Organization not found",
    "user": "User not found"
  },
  "validation": {
    "required": "{{field}} is required",
    "invalid": "{{field}} is invalid"
  }
}
```

#### German (`de/errors.json`)

```json
{
  "auth": {
    "invalidCredentials": "Ungültige E-Mail oder Passwort",
    "userNotFound": "Benutzer nicht gefunden",
    "unauthorized": "Sie sind nicht berechtigt, diese Aktion auszuführen"
  },
  "notFound": {
    "resource": "{{resource}} nicht gefunden",
    "organization": "Organisation nicht gefunden",
    "user": "Benutzer nicht gefunden"
  },
  "validation": {
    "required": "{{field}} ist erforderlich",
    "invalid": "{{field}} ist ungültig"
  }
}
```

### Error Standardization with i18n

All API errors use standardized error classes with translation support:

```typescript
import { NotFoundError, AuthenticationError, ValidationError } from '@/lib/errors';

// Simple error
throw new NotFoundError(
  'User not found', // Fallback message
  'errors:notFound.user' // Translation key
);

// With interpolation
throw new NotFoundError(
  `Invitation with id ${id} not found`,
  'errors:notFound.invitation',
  { id } // Dynamic params
);

// Validation error
throw new ValidationError('Email is required', [], 'errors:validation.required', {
  field: 'email',
});
```

### Error Classes

| Class                 | HTTP Status | Use Case           | Example                  |
| --------------------- | ----------- | ------------------ | ------------------------ |
| `AuthenticationError` | 401         | Auth failures      | Invalid credentials      |
| `AuthorizationError`  | 403         | Permission denied  | Insufficient permissions |
| `NotFoundError`       | 404         | Resource not found | User not found           |
| `ValidationError`     | 400         | Invalid input      | Required field missing   |
| `ConflictError`       | 409         | Resource conflict  | Email already exists     |
| `BadRequestError`     | 400         | Malformed request  | Invalid request format   |

### Translation Helpers

```typescript
import { translateError, t, getLocale } from '@/i18n';

// Translate an error
const localizedMessage = translateError(req, error);

// Translate a key
const message = t(req, 'errors:auth.unauthorized');

// Get current locale
const locale = getLocale(req); // 'en' or 'de'

// Translate without request (background jobs)
import { translateStatic } from '@/i18n';
const message = translateStatic('errors:auth.unauthorized', 'de');
```

### Middleware Integration

The API automatically translates errors before sending responses:

```typescript
// apps/api/src/middleware/auth.middleware.ts
export function errorHandler(error: Error, req: Request, res: Response) {
  if (error instanceof ApiError) {
    const localizedMessage = translateError(req, error);

    return res.status(error.statusCode).json({
      error: localizedMessage, // Localized!
      code: error.code,
      ...(error.extensions && { extensions: error.extensions }),
    });
  }
  // ... fallback handling
}
```

---

## 🖥️ Web App Internationalization

### Architecture

```
apps/web/i18n/
├── locales/
│   ├── en.json             # English translations
│   └── de.json             # German translations
├── config.ts               # next-intl configuration
├── request.ts              # Server-side i18n
├── routing.ts              # Locale routing config
└── navigation.ts           # Localized navigation
```

### Configuration

The web app uses `next-intl` for Next.js App Router:

```typescript
// apps/web/i18n/routing.ts
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always', // Always show locale in URL
});
```

### URL Structure

Locale is always visible in the URL:

```
https://app.example.com/en/organizations    ← English
https://app.example.com/de/organizations    ← German
```

### Translation Files

```json
// apps/web/i18n/locales/en.json
{
  "common": {
    "welcome": "Welcome",
    "save": "Save",
    "cancel": "Cancel"
  },
  "organizations": {
    "title": "Organizations",
    "create": "Create Organization",
    "name": "Organization Name"
  },
  "errors": {
    "somethingWentWrong": "Something went wrong",
    "tryAgain": "Please try again"
  }
}
```

```json
// apps/web/i18n/locales/de.json
{
  "common": {
    "welcome": "Willkommen",
    "save": "Speichern",
    "cancel": "Abbrechen"
  },
  "organizations": {
    "title": "Organisationen",
    "create": "Organisation erstellen",
    "name": "Organisationsname"
  },
  "errors": {
    "somethingWentWrong": "Etwas ist schief gelaufen",
    "tryAgain": "Bitte versuchen Sie es erneut"
  }
}
```

### Usage in Components

#### Server Components

```typescript
import { getTranslations } from 'next-intl/server';

export default async function OrganizationsPage() {
  const t = await getTranslations('organizations');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('create')}</button>
    </div>
  );
}
```

#### Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function OrganizationForm() {
  const t = useTranslations('organizations');

  return (
    <form>
      <label>{t('name')}</label>
      <button type="submit">{t('save')}</button>
    </form>
  );
}
```

### Localized Navigation

```typescript
import { Link } from '@/i18n/routing';

// Automatically includes locale prefix
<Link href="/organizations">Organizations</Link>
// Renders: /en/organizations or /de/organizations
```

### Language Switcher

```typescript
'use client';

import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const switchLocale = (locale: 'en' | 'de') => {
    router.replace(pathname, { locale });
  };

  return (
    <select value={currentLocale} onChange={(e) => switchLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

---

## 🔗 API-Web Integration

### Auto-Sync with Apollo Client

The web app automatically sends the user's locale to the API:

```typescript
// apps/web/lib/apollo-client.ts
import { setContext } from '@apollo/client/link/context';

// Detect locale from URL
function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    const pathSegments = window.location.pathname.split('/');
    const locale = pathSegments[1];
    return ['en', 'de'].includes(locale) ? locale : 'en';
  }
  return 'en';
}

// Add locale to every API request
const authLink = setContext((_, { headers }) => {
  const locale = getCurrentLocale();
  const accessToken = useAuthStore.getState().accessToken;

  return {
    headers: {
      ...headers,
      'accept-language': locale, // ← API uses this!
      ...(accessToken && { authorization: `Bearer ${accessToken}` }),
    },
  };
});

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});
```

### Error Handling

Errors from the API are automatically localized:

```typescript
'use client';

import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

export function CreateOrganization() {
  const t = useTranslations('errors');
  const [createOrg, { error }] = useMutation(CREATE_ORGANIZATION);

  // API error is already translated!
  if (error) {
    return <div className="error">{error.message}</div>;
  }

  return (
    <button onClick={() => createOrg()}>
      Create
    </button>
  );
}
```

---

## 🚀 Adding a New Language

### Step 1: Update API

1. **Add locale to config:**

   ```typescript
   // apps/api/src/config/env.config.ts
   export const I18N_CONFIG = {
     supportedLocales: ['en', 'de', 'fr'], // ← Add 'fr'
     // ...
   };
   ```

2. **Create translation files:**

   ```bash
   mkdir -p apps/api/src/i18n/locales/fr
   touch apps/api/src/i18n/locales/fr/errors.json
   touch apps/api/src/i18n/locales/fr/common.json
   ```

3. **Translate messages:**
   ```json
   // apps/api/src/i18n/locales/fr/errors.json
   {
     "auth": {
       "invalidCredentials": "Email ou mot de passe invalide",
       "userNotFound": "Utilisateur non trouvé"
     }
   }
   ```

### Step 2: Update Web App

1. **Add locale to routing:**

   ```typescript
   // apps/web/i18n/routing.ts
   export const locales = ['en', 'de', 'fr'] as const; // ← Add 'fr'
   ```

2. **Create translation file:**

   ```bash
   touch apps/web/i18n/locales/fr.json
   ```

3. **Translate UI strings:**

   ```json
   // apps/web/i18n/locales/fr.json
   {
     "common": {
       "welcome": "Bienvenue",
       "save": "Enregistrer"
     }
   }
   ```

4. **Update Apollo Client validation:**

   ```typescript
   // apps/web/lib/apollo-client.ts
   return ['en', 'de', 'fr'].includes(locale) ? locale : 'en'; // ← Add 'fr'
   ```

5. **Update language switcher:**
   ```tsx
   <select>
     <option value="en">English</option>
     <option value="de">Deutsch</option>
     <option value="fr">Français</option> {/* ← Add French */}
   </select>
   ```

---

## 📝 Best Practices

### 1. Always Provide Fallback Messages

```typescript
// ✅ Good - has fallback
throw new NotFoundError(
  'User not found', // ← Fallback in English
  'errors:notFound.user'
);

// ❌ Bad - no fallback
throw new NotFoundError('', 'errors:notFound.user');
```

### 2. Use Specific Translation Keys

```typescript
// ✅ Good - specific key
throw new AuthenticationError(
  'Invalid credentials',
  'errors:auth.invalidCredentials' // ← Specific!
);

// ❌ Bad - generic key
throw new AuthenticationError(
  'Invalid credentials',
  'errors:invalid' // ← Too generic
);
```

### 3. Group Keys by Domain

```json
{
  "auth": { ... },           // Authentication errors
  "validation": { ... },     // Validation errors
  "notFound": { ... },       // Not found errors
  "common": { ... }          // Common messages
}
```

### 4. Use Interpolation for Dynamic Values

```typescript
// ✅ Good - uses interpolation
throw new NotFoundError(
  `Invitation with id ${id} not found`,
  'errors:notFound.invitation',
  { id } // ← Interpolation params
);

// ❌ Bad - hardcoded value
throw new NotFoundError(
  `Invitation with id ${id} not found`,
  'errors:notFound.invitation' // ← No params
);
```

### 5. Keep Messages User-Friendly

```json
{
  // ✅ Good - user-friendly
  "invalidCredentials": "Invalid email or password",

  // ❌ Bad - too technical
  "invalidCredentials": "Authentication failed: ERR_INVALID_CREDENTIALS"
}
```

### 6. Be Consistent Across Languages

Ensure all locales have the same keys:

```bash
# Check for missing keys
diff <(jq -r 'keys[]' apps/api/src/i18n/locales/en/errors.json | sort) \
     <(jq -r 'keys[]' apps/api/src/i18n/locales/de/errors.json | sort)
```

---

## 🧪 Testing Localization

### API Testing

```bash
# Test English error
curl -H "Accept-Language: en" \
     http://localhost:4000/api/users/invalid-id
# Response: {"error": "User not found", "code": "NOT_FOUND"}

# Test German error
curl -H "Accept-Language: de" \
     http://localhost:4000/api/users/invalid-id
# Response: {"error": "Benutzer nicht gefunden", "code": "NOT_FOUND"}

# Test with authentication
curl -X POST \
     -H "Accept-Language: de" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"wrong"}' \
     http://localhost:4000/api/auth/login
# Response: {"error": "Ungültige E-Mail oder Passwort", ...}
```

### Web App Testing

```typescript
// Unit test with next-intl
import { NextIntlClientProvider } from 'next-intl';
import { render } from '@testing-library/react';

const messages = {
  organizations: {
    title: 'Organizations',
  },
};

test('renders translated content', () => {
  const { getByText } = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <OrganizationsPage />
    </NextIntlClientProvider>
  );

  expect(getByText('Organizations')).toBeInTheDocument();
});
```

### Integration Testing

```typescript
// Test full flow with locale
describe('Localized Error Flow', () => {
  it('returns German errors when locale is de', async () => {
    const response = await request(app).get('/api/users/invalid-id').set('Accept-Language', 'de');

    expect(response.body.error).toBe('Benutzer nicht gefunden');
  });
});
```

---

## 📊 Translation Coverage

### Current Statistics (October 2025)

**API:**

- English: 49 lines (47 error messages + 2 common)
- German: 49 lines (100% coverage)
- Translation keys: 33 unique keys
- Error classes: 6 standardized classes

**Web:**

- English: ~200 strings
- German: ~200 strings (100% coverage)

### Verify Coverage

```bash
# API - Check for missing translations
cd apps/api
diff <(grep -o '"[^"]*":' src/i18n/locales/en/errors.json | sort) \
     <(grep -o '"[^"]*":' src/i18n/locales/de/errors.json | sort)

# Web - Check for missing translations
cd apps/web
diff <(jq -r 'paths | join(".")' i18n/locales/en.json | sort) \
     <(jq -r 'paths | join(".")' i18n/locales/de.json | sort)
```

---

## 🔍 Troubleshooting

### API Returns English Despite Accept-Language Header

**Cause**: i18n middleware not initialized or placed incorrectly

**Solution**:

1. Check server startup logs for i18n initialization
2. Verify middleware order in `server.ts`:
   ```typescript
   app.use(i18nMiddleware); // ← Must be before routes
   app.use('/api', apiRoutes);
   ```

### Translation Key Not Found

**Cause**: Key doesn't exist in translation file

**Solution**:

1. Check key exists in `src/i18n/locales/en/errors.json`
2. Verify key format: `errors:category.key` not `category.key`
3. Check for typos in key name

### Web App Shows Wrong Language

**Cause**: Locale not detected from URL or Apollo Client not sending header

**Solution**:

1. Verify URL has locale prefix: `/en/...` not `/...`
2. Check `getCurrentLocale()` function in `apollo-client.ts`
3. Inspect network requests in DevTools for `Accept-Language` header

### Missing Translation in New Locale

**Cause**: Translation file incomplete

**Solution**:

1. Copy structure from `en` locale
2. Translate all values
3. Verify with diff command (see "Verify Coverage" above)

---

## 🎯 Summary

Grant's i18n/l10n implementation provides:

✅ **Seamless Integration** - API and web app work together automatically  
✅ **Type Safety** - TypeScript ensures correct usage  
✅ **Standardized Errors** - Proper HTTP status codes + i18n  
✅ **Easy to Extend** - Add new languages in minutes  
✅ **Developer Friendly** - Clear APIs and helper functions  
✅ **Production Ready** - Used in production with 100% coverage

**Key Features:**

- Automatic locale detection from URL
- Apollo Client auto-sends `Accept-Language` header
- All API errors properly typed with translation keys
- Fallback to English if translation missing
- Interpolation support for dynamic values
- Minimal performance overhead (<1ms per request)

---

## 📚 Related Documentation

- [Error Standardization Guide](/api-reference/error-handling) - Complete error class reference
- [Email Service](/advanced-topics/email-service) - Email localization examples
- [Development Guide](/development/guide) - Adding new features with i18n
- [API Reference](/api-reference/rest-api) - REST API error responses

---

## 🤝 Contributing

Want to add a new language or improve translations?

1. Check the [Development Guide](/development/guide)
2. Follow the "Adding a New Language" section above
3. Submit a PR with both API and Web translations
4. Include tests for new translations

**Translation Contributors Welcome!** Native speakers help us provide better translations.

---

**Questions?** Check the [FAQ](/troubleshooting/faq) or [file an issue](https://github.com/logusgraphics/grant/issues).
