export interface BreadCrumbItem {
  label: string;
  href?: string;
}

type Translate = (key: string) => string;

/** Names of the entities the current page has loaded, keyed like the route param. */
export type BreadcrumbEntityNames = Partial<
  Record<
    | 'organizationId'
    | 'accountId'
    | 'projectId'
    | 'userId'
    | 'roleId'
    | 'groupId'
    | 'permissionId'
    | 'appId'
    | 'resourceId'
    | 'jobId'
    | 'subscriptionId'
    | 'apiKeyId'
    | 'settingsProjectId',
    string | null | undefined
  >
>;

export interface BreadcrumbInput {
  /** The path without its locale, e.g. `/dashboard/organizations/o-1/roles`. */
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  /** `common` translations. */
  t: Translate;
  /** `dashboard.navigation` translations. */
  dashboardT: Translate;
  /** `settings.navigation` translations. */
  settingsNavT: Translate;
  names: BreadcrumbEntityNames;
}

/** Static segments with a page of their own, labelled from `dashboard.navigation`. */
const SEGMENT_LABEL_KEYS: Record<string, string> = {
  users: 'users',
  roles: 'roles',
  groups: 'groups',
  permissions: 'permissions',
  tags: 'tags',
  members: 'members',
  settings: 'settings',
  account: 'account',
  apps: 'projectApps',
  resources: 'resources',
  'api-keys': 'apiKeys',
  'signing-keys': 'signingKeys',
  'import-export': 'projectSyncJobs',
  webhooks: 'webhooks',
  notifications: 'notifications',
  branding: 'branding',
  'oauth-connections': 'oauthConnections',
};

/** `/dashboard/settings/<segment>` pages, labelled from `settings.navigation`. */
const SETTINGS_SEGMENTS = new Set([
  'account',
  'profile',
  'security',
  'preferences',
  'privacy',
  'notifications',
]);

/**
 * Detail pages: the id param, the list segment before it and its label. The list crumb is
 * added when the path did not already produce it; the detail crumb shows the loaded entity's
 * name, else the id while it loads.
 */
const ENTITY_RULES: ReadonlyArray<{
  param: keyof BreadcrumbEntityNames;
  listSegment: string;
}> = [
  { param: 'userId', listSegment: 'users' },
  { param: 'roleId', listSegment: 'roles' },
  { param: 'groupId', listSegment: 'groups' },
  { param: 'permissionId', listSegment: 'permissions' },
  { param: 'appId', listSegment: 'apps' },
  { param: 'resourceId', listSegment: 'resources' },
  { param: 'jobId', listSegment: 'import-export' },
  { param: 'subscriptionId', listSegment: 'webhooks' },
  { param: 'apiKeyId', listSegment: 'api-keys' },
];

/** Segments that have no page of their own, so no crumb (`/dashboard/accounts` is not a page). */
const SEGMENTS_WITHOUT_PAGE = new Set(['dashboard', 'accounts']);

const param = (params: BreadcrumbInput['params'], key: string): string | undefined => {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * The breadcrumb trail of a dashboard path: Dashboard, then one crumb per path segment that
 * has a page. A segment no rule knows is left out; the route-tree test keeps that from
 * happening to a real page.
 */
export function buildBreadcrumbs(input: BreadcrumbInput): BreadCrumbItem[] {
  const { pathname, params, t, dashboardT, settingsNavT, names } = input;
  const crumbs: BreadCrumbItem[] = [{ label: t('navigation.dashboard'), href: '/dashboard' }];
  const isSettingsPath = pathname.startsWith('/dashboard/settings');
  const locale = param(params, 'locale');

  let currentPath = '';
  for (const segment of pathname.split('/').filter(Boolean)) {
    currentPath += `/${segment}`;
    if (segment === locale || SEGMENTS_WITHOUT_PAGE.has(segment)) continue;

    const push = (label: string, href: string | undefined = currentPath) =>
      crumbs.push(href === undefined ? { label } : { label, href });

    if (segment === 'organizations') {
      push(t('organizations.title'));
      continue;
    }
    if (segment === param(params, 'organizationId')) {
      push(names.organizationId || t('loading'));
      continue;
    }
    if (segment === param(params, 'accountId')) {
      push(names.accountId || dashboardT('account'));
      continue;
    }

    if (isSettingsPath) {
      if (segment === 'projects') {
        push(settingsNavT('projectMemberships'));
        continue;
      }
      if (segment === param(params, 'projectId')) {
        push(names.settingsProjectId || t('loading'));
        continue;
      }
      if (SETTINGS_SEGMENTS.has(segment)) {
        push(settingsNavT(segment));
        continue;
      }
    }

    if (segment === 'projects') {
      push(t('projects.title'));
      continue;
    }
    if (segment === param(params, 'projectId')) {
      push(names.projectId || t('projects.project'));
      continue;
    }
    if (segment in SEGMENT_LABEL_KEYS) {
      push(dashboardT(SEGMENT_LABEL_KEYS[segment]));
      continue;
    }
    if (segment === 'new') {
      push(t('actions.create'), undefined);
      continue;
    }
    if (segment === 'test' && param(params, 'appId')) {
      push(dashboardT('testApp'), undefined);
      continue;
    }

    const rule = ENTITY_RULES.find((candidate) => segment === param(params, candidate.param));
    if (rule) {
      const listLabel = dashboardT(SEGMENT_LABEL_KEYS[rule.listSegment]);
      if (!crumbs.some((crumb) => crumb.label === listLabel)) {
        push(listLabel, currentPath.slice(0, currentPath.lastIndexOf('/')));
      }
      push(names[rule.param] || segment);
      continue;
    }
  }

  return crumbs;
}
