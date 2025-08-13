# Common Components

This directory contains reusable components that are shared across the application.

## Breadcrumb

The `Breadcrumb` component provides navigation breadcrumbs for the dashboard routes. It automatically generates breadcrumb items based on the current URL path and provides clickable navigation links.

### Features

- **Automatic Path Detection**: Automatically detects the current route and generates appropriate breadcrumb items
- **Internationalization**: Supports multiple languages through the translation system
- **Responsive Design**: Hidden on mobile devices to save space, but available in the mobile menu
- **Smart Labeling**: Provides meaningful labels for different route segments
- **Integrated Styling**: Subtle background styling that integrates seamlessly with the header design
- **Dynamic Names**: Displays actual organization and project names instead of generic labels
- **Real-time Data**: Fetches current organization and project data using GraphQL queries

### Usage

```tsx
import { Breadcrumb } from '@/components/common/Breadcrumb';

// The component automatically detects the current route and fetches data
<Breadcrumb />;
```

### Dynamic Data Integration

The breadcrumb component automatically fetches and displays:

- **Organization Names**: Real organization names from the GraphQL API
- **Project Names**: Real project names from the GraphQL API
- **Fallback Labels**: Generic labels when data is still loading or unavailable

**Data Sources:**

- Uses existing `useOrganizations({ ids: [id] })` hook to fetch organization details
- Uses existing `useProjects({ ids: [id] })` hook to fetch project details
- Leverages existing GraphQL queries with `ids` parameter for single entities
- Automatically skips queries when IDs are not available
- Provides loading states and error handling

### Positioning & Layout

The breadcrumb is positioned in the header with the following layout:

- **Desktop**: Centered between the logo and right-side controls, with subtle background styling
- **Mobile**: Hidden from header to save space, but prominently displayed in the mobile menu
- **Styling**: Uses `bg-muted/30` background with rounded corners for better visual integration

### Route Examples

The breadcrumb component handles various route patterns with dynamic names:

- **Dashboard**: `/dashboard` → `Dashboard`
- **Organizations**: `/dashboard/organizations` → `Dashboard > Organizations`
- **Organization**: `/dashboard/organizations/[id]` → `Dashboard > Organizations > Acme Corp`
- **Projects**: `/dashboard/organizations/[id]/projects` → `Dashboard > Organizations > Acme Corp > Projects`
- **Project**: `/dashboard/organizations/[id]/projects/[id]` → `Dashboard > Organizations > Acme Corp > Projects > CRM Integration`
- **Users**: `/dashboard/organizations/[id]/projects/[id]/users` → `Dashboard > Organizations > Acme Corp > Projects > CRM Integration > Users`

### Translation Keys

The component uses the following translation keys:

- `common.navigation.dashboard` - Dashboard label
- `common.organizations.title` - Organizations label
- `common.organizations.organization` - Generic organization label
- `common.projects.title` - Projects label
- `common.projects.project` - Generic project label
- `dashboard.navigation.*` - Various navigation item labels (users, roles, groups, etc.)

**Navigation Item Translations:**

- `dashboard.navigation.users` - Users
- `dashboard.navigation.roles` - Roles
- `dashboard.navigation.groups` - Groups
- `dashboard.navigation.permissions` - Permissions
- `dashboard.navigation.tags` - Tags
- `dashboard.navigation.members` - Members
- `dashboard.navigation.settings` - Settings
- `dashboard.navigation.account` - Account

### Implementation Details

- **No Absolute Positioning**: The breadcrumb uses flexbox layout to avoid positioning conflicts
- **Clean Header Layout**: Removed redundant dashboard navigation links that were overlapping
- **Responsive Design**: Automatically adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and semantic HTML structure
- **Translation Hooks**: Uses separate hooks for `common.*` and `dashboard.navigation.*` keys
- **Efficient Data Fetching**: Reuses existing hooks with `ids` parameter for single entities
- **Minimal Code**: No duplicate queries or hooks - leverages existing infrastructure

### Future Enhancements

- **Dynamic Names**: Replace generic labels with actual organization and project names
- **Custom Breadcrumbs**: Allow pages to override breadcrumb generation
- **Breadcrumb Context**: Provide context for more intelligent breadcrumb generation
- **Animation**: Add smooth transitions when breadcrumb items change
