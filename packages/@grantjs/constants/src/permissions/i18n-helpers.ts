export enum I18nPrefix {
  Roles = 'roles',
  Groups = 'groups',
  Resources = 'resources',
}

function toCamelCase(identifier: string): string {
  if (identifier.includes('-')) {
    return identifier
      .split('-')
      .map((part, index) => {
        if (index === 0) {
          return part.charAt(0).toLowerCase() + part.slice(1);
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('');
  }
  return identifier.charAt(0).toLowerCase() + identifier.slice(1);
}

function getKeyName<T extends Record<string, string>>(keyObj: T, value: T[keyof T]): string {
  const key = Object.keys(keyObj).find((k) => keyObj[k] === value);
  if (!key) {
    throw new Error(`Key not found for value: ${value}`);
  }
  return key;
}

export function getNameKey<T extends Record<string, string>>(
  keyObj: T,
  value: T[keyof T],
  prefix: I18nPrefix
): string {
  const keyName = getKeyName(keyObj, value);
  return `${prefix}.names.${toCamelCase(keyName)}`;
}

export function getDescriptionKey<T extends Record<string, string>>(
  keyObj: T,
  value: T[keyof T],
  prefix: I18nPrefix
): string {
  const keyName = getKeyName(keyObj, value);
  return `${prefix}.descriptions.${toCamelCase(keyName)}`;
}

export function isRoleI18nKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return key.startsWith('roles.names.') || key.startsWith('roles.descriptions.');
}
