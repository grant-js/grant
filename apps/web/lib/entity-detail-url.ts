interface EntityDetailUrlParams {
  organizationId?: string;
  accountId?: string;
  projectId?: string;
  entitySegment: 'roles' | 'groups' | 'permissions' | 'users' | 'resources' | 'apps';
  entityId: string;
}

export function getEntityDetailUrl({
  organizationId,
  accountId,
  projectId,
  entitySegment,
  entityId,
}: EntityDetailUrlParams): string {
  if (projectId) {
    if (organizationId) {
      return `/dashboard/organizations/${organizationId}/projects/${projectId}/${entitySegment}/${entityId}`;
    }
    if (accountId) {
      return `/dashboard/accounts/${accountId}/projects/${projectId}/${entitySegment}/${entityId}`;
    }
  }

  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/${entitySegment}/${entityId}`;
  }

  throw new Error('Invalid scope for entity detail URL');
}

interface EntityCreateUrlParams {
  organizationId?: string;
  accountId?: string;
  projectId?: string;
  entitySegment: 'roles' | 'groups' | 'permissions' | 'users' | 'resources' | 'apps';
}

export function getEntityCreateUrl({
  organizationId,
  accountId,
  projectId,
  entitySegment,
}: EntityCreateUrlParams): string {
  if (projectId) {
    if (organizationId) {
      return `/dashboard/organizations/${organizationId}/projects/${projectId}/${entitySegment}/new`;
    }
    if (accountId) {
      return `/dashboard/accounts/${accountId}/projects/${projectId}/${entitySegment}/new`;
    }
  }

  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/${entitySegment}/new`;
  }

  throw new Error('Invalid scope for entity create URL');
}

interface ProjectAppTestUrlParams {
  organizationId?: string;
  accountId?: string;
  projectId: string;
  appId: string;
}

export function getProjectAppTestUrl({
  organizationId,
  accountId,
  projectId,
  appId,
}: ProjectAppTestUrlParams): string {
  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/projects/${projectId}/apps/${appId}/test`;
  }
  if (accountId) {
    return `/dashboard/accounts/${accountId}/projects/${projectId}/apps/${appId}/test`;
  }
  throw new Error('Invalid scope for project app test URL');
}

interface ProjectSyncJobDetailUrlParams {
  organizationId?: string;
  accountId?: string;
  projectId: string;
  jobId: string;
}

export function getProjectSyncJobDetailUrl({
  organizationId,
  accountId,
  projectId,
  jobId,
}: ProjectSyncJobDetailUrlParams): string {
  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/projects/${projectId}/import-export/${jobId}`;
  }
  if (accountId) {
    return `/dashboard/accounts/${accountId}/projects/${projectId}/import-export/${jobId}`;
  }
  throw new Error('Invalid scope for project sync job detail URL');
}

export function getProjectImportExportListUrl({
  organizationId,
  accountId,
  projectId,
}: Omit<ProjectSyncJobDetailUrlParams, 'jobId'>): string {
  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/projects/${projectId}/import-export`;
  }
  if (accountId) {
    return `/dashboard/accounts/${accountId}/projects/${projectId}/import-export`;
  }
  throw new Error('Invalid scope for project import/export list URL');
}

interface WebhookDetailUrlParams {
  organizationId?: string;
  accountId?: string;
  projectId: string;
  subscriptionId: string;
}

export function getWebhookDetailUrl({
  organizationId,
  accountId,
  projectId,
  subscriptionId,
}: WebhookDetailUrlParams): string {
  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/projects/${projectId}/webhooks/${subscriptionId}`;
  }
  if (accountId) {
    return `/dashboard/accounts/${accountId}/projects/${projectId}/webhooks/${subscriptionId}`;
  }
  throw new Error('Invalid scope for webhook detail URL');
}

export function getWebhookListUrl({
  organizationId,
  accountId,
  projectId,
}: Omit<WebhookDetailUrlParams, 'subscriptionId'>): string {
  if (organizationId) {
    return `/dashboard/organizations/${organizationId}/projects/${projectId}/webhooks`;
  }
  if (accountId) {
    return `/dashboard/accounts/${accountId}/projects/${projectId}/webhooks`;
  }
  throw new Error('Invalid scope for webhook list URL');
}
