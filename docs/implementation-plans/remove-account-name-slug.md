# Plan: Remove Account Name and Slug Fields

## Overview

Remove the `name` and `slug` (username) fields from the account schema to simplify the registration and account management flow. Since users can only have a personal and an organization account, the account type provides sufficient labeling without the overhead of custom names and usernames.

## Rationale

- Users can only have two accounts: one personal and one organization
- Account type (`personal` | `organization`) provides sufficient labeling
- Reduces complexity in registration form
- Eliminates username validation and uniqueness checks
- Removes slug generation and conflict resolution logic
- Simplifies account management UI

## Impact Analysis

### Database Schema

- **Fields to remove**: `name`, `slug`
- **Constraints to remove**:
  - Unique constraint on `slug` (`accounts_slug_unique`)
  - Index on `slug` (`accounts_slug_idx`)
- **Indexes to remove**: `accounts_slug_idx`

### GraphQL Schema Changes

- **Account type**: Remove `name` and `slug` fields
- **CreateAccountInput**: Remove `name` and `username` fields
- **UpdateAccountInput**: Remove `name` and `slug` fields (or remove entire input if no fields remain)
- **AccountSearchableField**: Remove `name` and `slug` enum values
- **Queries**: Remove `checkUsername` query and resolver
- **Types**: Remove `UsernameAvailability` type

### Backend Changes

#### Repositories (`apps/api/src/repositories/accounts.repository.ts`)

- Remove `generateSlug()` method
- Remove `findBySlug()` method
- Remove `findAvailableSlug()` method
- Update `createAccount()` to remove name/slug parameters
- Update `updateAccount()` to remove name/slug parameters (or remove method if no updatable fields remain)
- Remove slug from `searchFields` array

#### Services (`apps/api/src/services/accounts.service.ts`)

- Remove `checkUsernameAvailability()` method
- Remove `findAvailableSlug()` method
- Update `createAccount()` to remove name/slug parameters
- Update `updateAccount()` to remove name/slug parameters
- Update `createComplementaryAccount()` to remove name parameter
- Update audit logging to remove name/slug from oldValues/newValues

#### Handlers (`apps/api/src/handlers/accounts.handler.ts`)

- Remove `checkUsername()` method
- Update `createAccount()` to remove name/username parameters
- Update `createComplementaryAccount()` to remove name/username parameters
- Update GitHub OAuth account creation to remove name/slug generation

#### GraphQL Resolvers

- Remove `checkUsername` resolver (`apps/api/src/graphql/resolvers/accounts/queries/check-username.resolver.ts`)
- Remove export from `apps/api/src/graphql/resolvers/accounts/queries/index.ts`
- Remove from `apps/api/src/graphql/resolvers/queries.ts`
- Update `updateAccount` mutation resolver to handle removal of name/slug

#### Schemas (`apps/api/src/services/accounts.schemas.ts`)

- Remove name/slug from create account schemas
- Remove name/slug from update account schemas
- Remove username validation schemas

#### REST Controllers (`apps/api/src/rest/controllers/oauth.controller.ts`)

- Remove name/slug generation from GitHub OAuth account creation

### Frontend Changes

#### Registration Form (`apps/web/app/[locale]/auth/register/page.tsx`)

- Remove `name` field from form schema
- Remove `username` field from form schema
- Remove username validation hook (`useUsernameValidation`)
- Remove slugify logic
- Simplify form to only collect email, password, and account type

#### Account Settings (`apps/web/app/[locale]/dashboard/settings/account/page.tsx`)

- Remove account details form (no longer needed)
- Update page to only show account type information

#### Components

- **AccountDetailsCard** (`apps/web/components/settings/AccountDetailsCard.tsx`): Remove or simplify to only show account type
- **AccountDropdown** (`apps/web/components/common/AccountDropdown.tsx`): Remove name and slug display, show only account type
- **AccountSelectionCard** (`apps/web/components/settings/AccountSelectionCard.tsx`): Remove slug display
- **AccountTypeCard** (`apps/web/components/settings/AccountTypeCard.tsx`): Remove slug display
- **CreateComplementaryAccountDialog** (`apps/web/components/settings/CreateComplementaryAccountDialog.tsx`): Remove name/username fields

#### Hooks

- Remove `useUsernameValidation` hook (`apps/web/hooks/accounts/useUsernameValidation.ts`)
- Update `useCreateComplementaryAccount` to remove name/username parameters

#### Schemas (`apps/web/lib/schemas/settings.ts`)

- Remove `accountSettingsSchema` (no longer needed)

#### Utilities

- Remove `slugifySafe` usage from account-related code (`apps/web/lib/slugify.ts` - keep file if used elsewhere)

### Internationalization

- Remove translations for:
  - Account name fields
  - Username fields
  - Username validation messages
  - Account name/slug update messages
- Keep account type translations

## Migration Strategy

### Phase 1: Database Migration

1. Create migration to:
   - Drop unique constraint on `slug`
   - Drop index on `slug`
   - Drop `slug` column
   - Drop `name` column

### Phase 2: Backend Updates

1. Update database schema definition
2. Update repositories (remove slug-related methods)
3. Update services (remove slug-related methods)
4. Update handlers (remove slug-related methods)
5. Update GraphQL schema (remove fields and queries)
6. Update GraphQL resolvers (remove checkUsername)
7. Update REST controllers

### Phase 3: Frontend Updates

1. Update registration form
2. Update account settings page
3. Update all account display components
4. Remove username validation hooks
5. Update translations

### Phase 4: Testing & Validation

1. Test account creation (email registration)
2. Test account creation (GitHub OAuth)
3. Test complementary account creation
4. Test account switching
5. Verify no references to name/slug remain
6. Test GraphQL queries/mutations
7. Verify database constraints removed

## Database Migration Script

```sql
-- Migration: Remove name and slug from accounts table
-- File: packages/@logusgraphics/grant-database/src/migrations/XXXX_remove_account_name_slug.sql

BEGIN;

-- Drop unique constraint on slug
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_slug_unique;

-- Drop index on slug
DROP INDEX IF EXISTS accounts_slug_idx;

-- Drop columns
ALTER TABLE accounts DROP COLUMN IF EXISTS slug;
ALTER TABLE accounts DROP COLUMN IF EXISTS name;

COMMIT;
```

## Files to Modify

### Database

- `packages/@logusgraphics/grant-database/src/schemas/accounts.schema.ts`
- `packages/@logusgraphics/grant-database/src/migrations/XXXX_remove_account_name_slug.sql` (new)

### GraphQL Schema

- `packages/@logusgraphics/grant-schema/src/schema/accounts/types/account.graphql`
- `packages/@logusgraphics/grant-schema/src/schema/accounts/inputs/create-account.graphql`
- `packages/@logusgraphics/grant-schema/src/schema/accounts/inputs/update-account.graphql`
- `packages/@logusgraphics/grant-schema/src/schema/accounts/types/account-searchable-field.graphql`
- `packages/@logusgraphics/grant-schema/src/schema/accounts/queries/check-username.graphql` (delete)
- `packages/@logusgraphics/grant-schema/src/schema/accounts/types/username-availability.graphql` (delete)
- `packages/@logusgraphics/grant-schema/src/operations/accounts/checkUsername.graphql` (delete)

### Backend API

- `apps/api/src/repositories/accounts.repository.ts`
- `apps/api/src/services/accounts.service.ts`
- `apps/api/src/services/accounts.schemas.ts`
- `apps/api/src/handlers/accounts.handler.ts`
- `apps/api/src/handlers/oauth.handler.ts`
- `apps/api/src/rest/controllers/oauth.controller.ts`
- `apps/api/src/graphql/resolvers/accounts/queries/check-username.resolver.ts` (delete)
- `apps/api/src/graphql/resolvers/accounts/queries/index.ts`
- `apps/api/src/graphql/resolvers/queries.ts`
- `apps/api/src/graphql/resolvers/accounts/mutations/update-account.resolver.ts`

### Frontend

- `apps/web/app/[locale]/auth/register/page.tsx`
- `apps/web/app/[locale]/dashboard/settings/account/page.tsx`
- `apps/web/components/settings/AccountDetailsCard.tsx`
- `apps/web/components/settings/AccountSelectionCard.tsx`
- `apps/web/components/settings/AccountTypeCard.tsx`
- `apps/web/components/settings/CreateComplementaryAccountDialog.tsx`
- `apps/web/components/common/AccountDropdown.tsx`
- `apps/web/hooks/accounts/useUsernameValidation.ts` (delete)
- `apps/web/hooks/accounts/useCreateComplementaryAccount.ts`
- `apps/web/lib/schemas/settings.ts`
- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/de.json`

## Potential Issues & Considerations

1. **Existing Data**: If there are existing accounts with names/slugs, the migration will remove this data. Consider if any data export is needed.

2. **Account Identification**: Currently accounts are identified by ID in routes, which is good. Ensure no code relies on slug for identification.

3. **Account Display**: Need to determine how to display accounts in UI:
   - Option A: Show only account type ("Personal" / "Organization")
   - Option B: Show account type + owner name ("John's Personal" / "Acme Corp Organization")
   - Option C: Show account type + owner email

4. **Complementary Account Creation**: Currently requires a name. Will need to be simplified to just account type selection.

5. **Search Functionality**: Removing name/slug from searchable fields means accounts can only be searched by other fields (if any remain).

6. **Audit Logs**: Ensure audit log references to name/slug are handled gracefully.

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Account creation via email registration works
- [ ] Account creation via GitHub OAuth works
- [ ] Complementary account creation works
- [ ] Account switching works
- [ ] Account display in dropdown shows correctly
- [ ] Account settings page loads without errors
- [ ] GraphQL queries return accounts without name/slug
- [ ] GraphQL mutations work without name/slug
- [ ] No console errors related to missing fields
- [ ] No references to name/slug in codebase (grep verification)

## Rollback Plan

If issues arise, rollback would require:

1. Reverting database migration (re-adding columns with nullable values)
2. Reverting all code changes
3. Restoring GraphQL schema files

However, data loss would occur for any accounts created after migration.
