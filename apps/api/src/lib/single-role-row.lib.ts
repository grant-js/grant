import type { IRoleRepository } from '@grantjs/core';

import { unboundedList } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * A role name only identifies a standard role while exactly one role row carries it: with more
 * than one, the name is treated as non-standard.
 */
export async function hasSingleRoleRow(
  roleRepository: IRoleRepository,
  roleName: string,
  transaction?: Transaction
): Promise<boolean> {
  const page = await roleRepository.getRoles(
    unboundedList({ search: roleName, limit: -1 }),
    transaction
  );
  return page.roles.filter((role) => role.name === roleName).length === 1;
}
