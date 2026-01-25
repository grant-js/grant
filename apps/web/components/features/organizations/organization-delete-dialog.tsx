'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';

import { DeleteDialog } from '@/components/common';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationDeleteDialog() {
  const { deleteOrganization } = useOrganizationMutations();

  const organizationToDelete = useOrganizationsStore((state) => state.organizationToDelete);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  // Scope permissions to this organization
  const scope = organizationToDelete
    ? { tenant: Tenant.Organization, id: organizationToDelete.id }
    : null;

  const canDelete = useGrant(ResourceSlug.Organization, ResourceAction.Delete, {
    scope: scope ?? undefined,
    enabled: scope !== null, // Skip check when scope is not available
  });

  if (!scope || !canDelete) {
    return null;
  }

  const handleDelete = async (id: string, name: string) => {
    await deleteOrganization({ id, scope: { id, tenant: Tenant.Organization } }, name);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!organizationToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={organizationToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="organizations"
    />
  );
}
