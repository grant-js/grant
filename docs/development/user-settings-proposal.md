# User Settings Module Proposal

## Overview

This document evaluates the current Account model and proposes a comprehensive user settings module structure. The settings will be organized into logical categories to provide a clear and intuitive user experience.

**Status:** ✅ Scaffolding Complete - Ready for Content Implementation

**Last Updated:** After Phase 0 completion (Navigation, Layout, Pages Structure)

## Current Data Model Analysis

### Account Model (`account.graphql`)

**Editable Fields:**

- `name: String!` - Account display name
- `slug: String!` - Username (URL-friendly identifier, editable with uniqueness check)

**Read-only Fields:**

- `id: ID!` - Unique identifier
- `type: AccountType!` - Account type (personal/organization) - **NOT changeable**
- `ownerId: ID!` - Account owner reference
- `owner: User!` - Owner relationship
- `projects: [Project!]` - Associated projects (managed separately)
- `createdAt: Date!` - Creation timestamp
- `updatedAt: Date!` - Last update timestamp
- `deletedAt: Date` - Soft delete timestamp

**Important Notes:**

- Users can have **both** a personal account and an organization account
- Account type cannot be changed after creation
- Account switching is handled via `AccountDropdown` component in the header

### User Model (`user.graphql`)

**Editable Fields:**

- `name: String!` - User display name

**Read-only Fields:**

- `id: ID!` - Unique identifier
- `roles: [Role!]` - User roles (managed by administrators, not self-service)
- `tags: [Tag!]` - User tags (managed by administrators, not self-service)
- `authenticationMethods: [UserAuthenticationMethod!]` - Auth methods (managed separately)
- `accounts: [Account!]` - Associated accounts
- `createdAt: Date!` - Creation timestamp
- `updatedAt: Date!` - Last update timestamp
- `deletedAt: Date` - Soft delete timestamp

**Important Notes:**

- Tags and roles are managed by administrators, not in user settings
- Avatar/profile picture support is planned for the near future

### UserAuthenticationMethod Model

**Editable Fields:**

- `providerId: String` - Email or OAuth provider ID
- `provider: UserAuthenticationMethodProvider` - Auth provider type
- `isVerified: Boolean` - Verification status
- `isPrimary: Boolean` - Primary method flag

**Operations:**

- Add new authentication method (email, OAuth)
- Remove authentication method
- Set primary method
- Verify email address
- Change password (for email provider)
- Reset password

### UserSession Model

**Operations:**

- View active sessions
- Revoke individual sessions
- Revoke all sessions (except current)
- View session details (device, location, last used)

## Proposed Settings Categories

### 1. **Account Information** (`/dashboard/settings/account`)

**Purpose:** Manage account-level settings and information

**Settings:**

- **Account Name**
  - Display name for the account
  - Updates `Account.name` via `UpdateAccountInput`

- **Username (Slug)**
  - Editable username/URL-friendly identifier
  - Updates `Account.slug` via `UpdateAccountInput` (requires schema update to add `slug` field)
  - Must validate uniqueness using `checkUsername` query
  - Real-time availability checking (reuse `useUsernameValidation` hook from registration)
  - Minimum length validation (3+ characters)
  - Shows availability status (available/unavailable/checking)
  - ⚠️ **Note:** Schema update required - `slug` field needs to be added to `UpdateAccountInput`

- **Account Type**
  - Display current account type (Personal/Organization)
  - **Read-only** - Account type cannot be changed after creation
  - Show informational card explaining:
    - Current account type features
    - Differences between Personal and Organization accounts
    - Benefits of having both account types

- **Complementary Account**
  - If user has only Personal account: Show option to create Organization account
  - If user has only Organization account: Show option to create Personal account
  - If user has both: Show information about account switching via header dropdown
  - Link to account creation flow with pre-selected complementary type

- **Account Owner**
  - Display current owner information
  - Read-only (ownership transfer may be a separate admin feature)

- **Account Created**
  - Display creation date
  - Read-only informational field

**UI Considerations:**

- Simple form layout with inline editing for name/username
- Username field with real-time availability indicator (reuse registration patterns)
- Informational card for account type with clear explanation
- Prominent call-to-action for creating complementary account (if applicable)
- Reference to account switcher in header if user has multiple accounts

---

### 2. **Profile Information** (`/dashboard/settings/profile`)

**Purpose:** Manage user profile details

**Settings:**

- **Display Name**
  - User's full name
  - Updates `User.name` via `UpdateUserInput`
  - Used across the platform for identification

- **Avatar/Profile Picture** (Future)
  - Profile picture upload
  - Currently not supported, but space reserved for future implementation
  - Will be available for all users in the near future

**UI Considerations:**

- Clean, simple profile form
- Inline editing for display name
- Placeholder/reserved space for avatar upload (with "Coming soon" indicator if not yet implemented)
- Note: Tags and roles are managed by administrators, not in user settings

---

### 3. **Login & Security** (`/dashboard/settings/security`)

**Purpose:** Manage authentication methods and security settings

**Settings:**

#### Authentication Methods

- **View All Methods**
  - List all authentication methods (email, Google, GitHub, etc.)
  - Show verification status, primary status, last used date
  - Display provider-specific information

- **Add Authentication Method**
  - Add email/password method
  - Connect OAuth providers (Google, GitHub, etc.)
  - Verify new methods

- **Remove Authentication Method**
  - Remove authentication methods
  - ⚠️ **Restriction:** Cannot remove if it's the only method
  - ⚠️ **Restriction:** Cannot remove primary method without setting another as primary

- **Set Primary Method**
  - Change which authentication method is primary
  - Updates `UserAuthenticationMethod.isPrimary` via `UpdateUserAuthenticationMethodInput`

- **Email Verification**
  - Resend verification email
  - Verify email address
  - Updates `UserAuthenticationMethod.isVerified`

#### Password Management (for email provider)

- **Change Password**
  - Current password + new password form
  - Uses password reset flow or dedicated change password mutation

- **Password Requirements**
  - Display password policy
  - Strength indicator

#### Active Sessions

- **View Active Sessions**
  - List all active sessions with:
    - Device/browser information (`userAgent`)
    - IP address (`ipAddress`)
    - Last used date (`lastUsedAt`)
    - Expiration date (`expiresAt`)
    - Current session indicator

- **Revoke Session**
  - Revoke individual sessions
  - Uses `UserSessionService.revokeSession()`

- **Revoke All Sessions**
  - Revoke all sessions except current
  - Uses `UserSessionService.invalidateAllUserSessions()`
  - ⚠️ **Warning:** Will log out all other devices

#### Two-Factor Authentication (2FA) (Future)

- **Enable 2FA**
  - Multi-factor authentication setup
  - Currently not implemented, but space reserved for future
  - Will include TOTP (Time-based One-Time Password) support

- **Manage 2FA**
  - View 2FA status
  - Disable 2FA (with confirmation)
  - Backup codes management

**UI Considerations:**

- Tabbed or sectioned layout
- Security-focused design (warnings, confirmations)
- Session list with device icons
- Reserved section for 2FA with "Coming soon" indicator if not yet implemented

---

### 4. **Preferences** (`/dashboard/settings/preferences`)

**Purpose:** User interface and application preferences

**Settings:**

- **Theme**
  - Light/Dark/System theme toggle
  - Already implemented in `ThemeToggle.tsx`
  - Persists user preference

- **Language**
  - Language/locale selection
  - Already implemented in `LanguageSwitcher.tsx`
  - Updates i18n locale

- **Notifications**
  - Email notification preferences
    - Account activity notifications
    - Security alerts (login attempts, password changes)
    - Project updates
    - Team invitations
    - System announcements
  - In-app notification settings
    - Browser notifications (if supported)
    - Notification frequency
  - Notification delivery preferences
    - Email digest frequency
    - Real-time vs batched notifications

- **Display Preferences**
  - Date/time format
  - Timezone selection
  - Number format preferences
  - First day of week (for calendars)

**UI Considerations:**

- Simple toggle/select components
- Reuse existing `ThemeToggle` and `LanguageSwitcher` components
- Group related preferences together
- Notification settings organized by category (security, activity, etc.)

---

### 5. **Privacy** (`/dashboard/settings/privacy`)

**Purpose:** Privacy and data management settings

**Settings:**

- **Data Export**
  - Export user data (GDPR compliance)
  - Download account data

- **Account Deletion**
  - Request account deletion
  - ⚠️ **Warning:** Permanent action
  - May require password confirmation
  - Soft delete via `deletedAt` field

- **Data Retention**
  - Information about data retention policies
  - Read-only informational content

**UI Considerations:**

- Clear warnings for destructive actions
- Confirmation modals with password verification
- Informational sections explaining policies

---

## Settings Navigation Structure

```
/dashboard/settings
├── /account          → Account Information
├── /profile         → Profile Information
├── /security        → Login & Security
├── /preferences     → Preferences
└── /privacy         → Privacy
```

**Alternative:** Single page with tabbed navigation:

```
/dashboard/settings
  ├── Account Tab
  ├── Profile Tab
  ├── Security Tab
  ├── Preferences Tab
  └── Privacy Tab
```

## Implementation Recommendations

### Phase 1: Core Settings (MVP)

1. **Account Information** - Basic account name and type management
2. **Profile Information** - User name and basic profile fields
3. **Preferences** - Theme and language (already partially implemented)

### Phase 2: Security Features

1. **Login & Security** - Authentication methods management
2. **Active Sessions** - Session viewing and revocation

### Phase 3: Advanced Features

1. **Privacy** - Data export and account deletion
2. **Advanced Profile** - Tags, roles management (if permitted)

## Technical Considerations

### GraphQL Mutations Available

- `updateAccount(id: ID!, input: UpdateAccountInput!)` - Update account name (slug support needs to be added to schema)
- `updateUser(id: ID!, input: UpdateUserInput!)` - Update user name
- `updateUserAuthenticationMethod(id: ID!, input: UpdateUserAuthenticationMethodInput!)` - Update auth methods
- `createUserAuthenticationMethod(input: CreateUserAuthenticationMethodInput!)` - Add auth method
- `deleteUserAuthenticationMethod(id: ID!)` - Remove auth method
- `checkUsername(username: String!)` - Check username availability (returns `{ available: Boolean, username: String }`)
- Session management via `UserSessionService` methods

**Schema Updates Needed:**

- Add `slug: String` to `UpdateAccountInput` in `packages/@logusgraphics/grant-schema/src/schema/accounts/inputs/update-account.graphql`

### GraphQL Queries Available

- `checkUsername(username: String!)` - Validate username uniqueness
- Account queries to fetch user's accounts for switching

### Validation Rules

- Account name: Required, min/max length
- Username (slug): Required, min 3 characters, must be unique (use `checkUsername` query)
- Account type: Read-only, cannot be changed after creation
- Password: Enforce password policy
- Authentication method removal: Ensure at least one method remains
- Primary method: Ensure exactly one primary method exists

### Security Considerations

- All mutations should require authentication
- Sensitive operations (password change, account deletion) should require re-authentication
- Session revocation should not affect current session immediately
- Username changes should require confirmation (may affect URLs, integrations)
- Account type is immutable after creation (security/billing implications)

## UI/UX Patterns

### Reuse Existing Components

- `DashboardPageLayout` - Page layout wrapper
- `ThemeToggle` - Theme switching (already exists)
- `LanguageSwitcher` - Language selection (already exists)
- `AccountDropdown` - Account switching (already exists in header)
- `useUsernameValidation` - Username availability checking hook (from registration)
- Form components from `@/components/ui`
- Dialog/Modal components for confirmations

### Navigation Pattern

- Sidebar navigation within settings (if multi-page)
- Breadcrumb navigation
- Tab navigation (if single-page with tabs)
- Back button to dashboard

### Form Patterns

- Inline editing where appropriate
- Save/Cancel buttons for forms
- Success/error toast notifications
- Loading states during mutations
- Optimistic updates where safe

## Implementation Phases

### Phase 1: Core Settings (MVP)

1. **Account Information**
   - Account name editing
   - Username editing with availability checking
   - Account type display with complementary account creation
   - Account creation date display

2. **Profile Information**
   - User display name editing
   - Reserved space for avatar (with "Coming soon" indicator)

3. **Preferences**
   - Theme toggle (already implemented, integrate)
   - Language switcher (already implemented, integrate)
   - Basic notification preferences structure

### Phase 2: Security Features

1. **Login & Security**
   - Authentication methods management (add/remove/set primary)
   - Email verification
   - Password change
   - Active sessions viewing and revocation
   - Reserved space for 2FA (with "Coming soon" indicator)

### Phase 3: Advanced Features

1. **Preferences Enhancement**
   - Complete notification preferences
   - Display preferences (date/time format, timezone)

2. **Privacy**
   - Data export (GDPR compliance)
   - Account deletion

3. **Future Features**
   - Avatar/profile picture upload
   - Two-factor authentication (2FA)

## Implementation Progress

### ✅ Completed (Phase 0: Scaffolding)

1. ✅ **Proposal Refined** - Based on user feedback
2. ✅ **Settings Navigation Component** - Created `SettingsNav.tsx` with 5 navigation items (Account, Profile, Security, Preferences, Privacy)
3. ✅ **Settings Layout** - Created `layout.tsx` with responsive sidebar navigation (desktop sidebar + mobile bottom nav)
4. ✅ **Settings Pages Structure** - Created all 5 settings pages:
   - `/dashboard/settings/account` - Account Information page
   - `/dashboard/settings/profile` - Profile Information page
   - `/dashboard/settings/security` - Login & Security page
   - `/dashboard/settings/preferences` - Preferences page
   - `/dashboard/settings/privacy` - Privacy page
5. ✅ **Main Settings Page** - Updated to redirect to `/dashboard/settings/account` by default
6. ✅ **Translation Keys** - Added all navigation and page translations for English and German
7. ✅ **AccountDropdown Integration** - Added Settings navigation button to AccountDropdown component

### 📋 Next Steps (Phase 1: Core Settings - MVP)

1. **Account Information Section**
   - Account name editing form
   - Username (slug) editing with real-time availability checking (reuse `useUsernameValidation` hook)
   - Account type display (read-only) with informational card
   - Complementary account creation flow (if user doesn't have both account types)
   - Account creation date display
   - Schema update: Add `slug: String` to `UpdateAccountInput`

2. **Profile Information Section**
   - User display name editing form
   - Avatar placeholder with "Coming soon" indicator

3. **Preferences Section**
   - Integrate existing `ThemeToggle` component
   - Integrate existing `LanguageSwitcher` component
   - Basic notification preferences structure (placeholder for future implementation)

### 🔜 Future Phases

**Phase 2: Security Features**

- Authentication methods management (add/remove/set primary)
- Email verification
- Password change
- Active sessions viewing and revocation
- Reserved space for 2FA (with "Coming soon" indicator)

**Phase 3: Advanced Features**

- Complete notification preferences
- Display preferences (date/time format, timezone)
- Privacy section (data export, account deletion)
- Avatar/profile picture upload (when backend support is ready)
- Two-factor authentication (2FA) implementation

## Resolved Questions

1. ✅ **Account Slug:** Editable username with uniqueness validation via `checkUsername` query
2. ✅ **Account Type:** Immutable after creation; users can create complementary account (Personal + Organization)
3. ✅ **Avatar Support:** Not currently supported, but will be available soon - space reserved in profile section
4. ✅ **Two-Factor Authentication:** Planned for future - space reserved in security section
5. ✅ **Notification Preferences:** Needed - section added with comprehensive notification settings
6. ✅ **Multi-Account Management:** Handled via `AccountDropdown` in header; settings page explains and links to account creation

## Files Created/Modified

### Created Files:

- `apps/web/components/navigation/SettingsNav.tsx` - Settings navigation component
- `apps/web/app/[locale]/dashboard/settings/layout.tsx` - Settings layout with sidebar
- `apps/web/app/[locale]/dashboard/settings/account/page.tsx` - Account settings page
- `apps/web/app/[locale]/dashboard/settings/profile/page.tsx` - Profile settings page
- `apps/web/app/[locale]/dashboard/settings/security/page.tsx` - Security settings page
- `apps/web/app/[locale]/dashboard/settings/preferences/page.tsx` - Preferences settings page
- `apps/web/app/[locale]/dashboard/settings/privacy/page.tsx` - Privacy settings page

### Modified Files:

- `apps/web/app/[locale]/dashboard/settings/page.tsx` - Updated to redirect to account settings
- `apps/web/components/common/AccountDropdown.tsx` - Added Settings navigation button
- `apps/web/i18n/locales/en.json` - Added settings translations
- `apps/web/i18n/locales/de.json` - Added settings translations (German)
