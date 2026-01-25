import { getDescriptionKey, getNameKey, I18nPrefix } from './i18n-helpers';

export const ResourceAction = {
  Create: 'Create',
  Read: 'Read',
  Update: 'Update',
  Delete: 'Delete',
  Query: 'Query',
  ExportData: 'ExportData',
  UploadPicture: 'UploadPicture',
  Remove: 'Remove',
  Accept: 'Accept',
  Revoke: 'Revoke',
  ResendEmail: 'ResendEmail',
  Renew: 'Renew',
  Exchange: 'Exchange',
};

export type ResourceAction = (typeof ResourceAction)[keyof typeof ResourceAction];

export interface ResourceDefinition {
  name: string;
  slug: string;
  actions: readonly ResourceAction[];
  description?: string;
}

export const ResourceSlug = {
  User: 'User',
  Account: 'Account',
  Organization: 'Organization',
  Project: 'Project',
  Resource: 'Resource',
  Role: 'Role',
  Group: 'Group',
  Permission: 'Permission',
  Tag: 'Tag',
  ApiKey: 'ApiKey',
  OrganizationMember: 'OrganizationMember',
  OrganizationInvitation: 'OrganizationInvitation',
  ProjectUser: 'ProjectUser',
  UserSession: 'UserSession',
  UserAuthenticationMethod: 'UserAuthenticationMethod',
};

export type ResourceSlug = (typeof ResourceSlug)[keyof typeof ResourceSlug];

type ResourceTemplate = Omit<ResourceDefinition, 'name' | 'description' | 'slug'>;

const RESOURCES: Record<ResourceSlug, ResourceTemplate> = {
  [ResourceSlug.User]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Read,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
      ResourceAction.ExportData,
      ResourceAction.UploadPicture,
    ],
  },
  [ResourceSlug.Account]: {
    actions: [ResourceAction.Read, ResourceAction.Delete, ResourceAction.Query],
  },
  [ResourceSlug.Organization]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Read,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Project]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Resource]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Role]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Group]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Permission]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.Tag]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.ApiKey]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Delete,
      ResourceAction.Query,
      ResourceAction.Revoke,
      ResourceAction.Exchange,
    ],
  },
  [ResourceSlug.OrganizationMember]: {
    actions: [
      ResourceAction.Read,
      ResourceAction.Update,
      ResourceAction.Remove,
      ResourceAction.Query,
    ],
  },
  [ResourceSlug.OrganizationInvitation]: {
    actions: [
      ResourceAction.Create,
      ResourceAction.Read,
      ResourceAction.Query,
      ResourceAction.Accept,
      ResourceAction.Revoke,
      ResourceAction.ResendEmail,
      ResourceAction.Renew,
    ],
  },
  [ResourceSlug.ProjectUser]: {
    actions: [ResourceAction.Read, ResourceAction.Query],
  },
  [ResourceSlug.UserSession]: {
    actions: [ResourceAction.Read, ResourceAction.Query],
  },
  [ResourceSlug.UserAuthenticationMethod]: {
    actions: [ResourceAction.Read, ResourceAction.Query],
  },
};

export const RESOURCE_DEFINITIONS: Record<ResourceSlug, ResourceDefinition> = Object.keys(
  ResourceSlug
).reduce(
  (acc, resourceSlugProp) => {
    const resourceSlugValue = ResourceSlug[resourceSlugProp as keyof typeof ResourceSlug];
    const template = RESOURCES[resourceSlugValue];
    if (!template) {
      throw new Error(`Resource template not found for slug: ${resourceSlugProp}`);
    }
    return {
      ...acc,
      [resourceSlugValue]: {
        name: getNameKey(ResourceSlug, resourceSlugValue, I18nPrefix.Resources),
        description: getDescriptionKey(ResourceSlug, resourceSlugValue, I18nPrefix.Resources),
        slug: resourceSlugValue,
        ...template,
      },
    };
  },
  {} as Record<ResourceSlug, ResourceDefinition>
);

export function getResourceSlugs(): ResourceSlug[] {
  return Object.keys(RESOURCE_DEFINITIONS) as ResourceSlug[];
}

export function getResourceDefinition(slug: ResourceSlug): ResourceDefinition {
  return RESOURCE_DEFINITIONS[slug];
}
