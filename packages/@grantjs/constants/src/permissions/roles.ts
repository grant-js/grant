import { getDescriptionKey, getNameKey, I18nPrefix } from './i18n-helpers';

export interface RoleDefinition {
  name: string;
  description: string;
  level?: number;
}

export const RoleKey = {
  PersonalAccountOwner: 'PersonalAccountOwner',
  OrganizationAccountOwner: 'OrganizationAccountOwner',
  OrganizationOwner: 'OrganizationOwner',
  OrganizationAdmin: 'OrganizationAdmin',
  OrganizationDev: 'OrganizationDev',
  OrganizationViewer: 'OrganizationViewer',
};

export type RoleKey = (typeof RoleKey)[keyof typeof RoleKey];

export const ACCOUNT_ROLES = [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner];

export const ACCOUNT_ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = ACCOUNT_ROLES.reduce(
  (acc, role: RoleKey) => ({
    ...acc,
    [role]: {
      name: getNameKey(RoleKey, role, I18nPrefix.Roles),
      description: getDescriptionKey(RoleKey, role, I18nPrefix.Roles),
    },
  }),
  {}
);

export const ORGANIZATION_ROLES = [
  RoleKey.OrganizationOwner,
  RoleKey.OrganizationAdmin,
  RoleKey.OrganizationDev,
  RoleKey.OrganizationViewer,
];

export const ORGANIZATION_ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> =
  ORGANIZATION_ROLES.reduce(
    (acc, roleKey, index) => ({
      ...acc,
      [roleKey]: {
        name: getNameKey(RoleKey, roleKey, I18nPrefix.Roles),
        description: getDescriptionKey(RoleKey, roleKey, I18nPrefix.Roles),
        level: index + 1,
      },
    }),
    {}
  );

export const ROLES: Record<RoleKey, RoleDefinition> = {
  ...ACCOUNT_ROLE_DEFINITIONS,
  ...ORGANIZATION_ROLE_DEFINITIONS,
};

export const ROLE_KEYS = Object.values(RoleKey) as RoleKey[];

export function getRoleLevelByName(roleName: string): number | undefined {
  const definition = Object.values(ORGANIZATION_ROLE_DEFINITIONS).find(
    (def) => def.name === roleName
  );
  return definition?.level;
}

export function canAssignRole(currentUserRoleName: string, targetRoleName: string): boolean {
  const currentLevel = getRoleLevelByName(currentUserRoleName);
  const targetLevel = getRoleLevelByName(targetRoleName);

  if (currentLevel === undefined || targetLevel === undefined) {
    return true;
  }

  return targetLevel > currentLevel;
}
