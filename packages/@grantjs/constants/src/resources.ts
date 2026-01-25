export const DEFAULT_RESOURCE_ACTIONS = ['query', 'read', 'create', 'update', 'delete'] as const;

export type DefaultResourceAction = (typeof DEFAULT_RESOURCE_ACTIONS)[number];

export function isDefaultResourceAction(action: string): action is DefaultResourceAction {
  return DEFAULT_RESOURCE_ACTIONS.includes(action as DefaultResourceAction);
}
