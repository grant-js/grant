'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourceDeleteDialog() {
  const scope = useScopeFromParams();
  const { deleteResource } = useResourceMutations();
  const resourceToDelete = useResourcesStore((state) => state.resourceToDelete);
  const setResourceToDelete = useResourcesStore((state) => state.setResourceToDelete);

  const canDelete = useGrant(ResourceSlug.Resource, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || !canDelete) {
    return null;
  }

  const handleDelete = async (id: string, name: string) => {
    await deleteResource({ id, scope: scope! });
  };

  const handleSuccess = async () => {
    if (!resourceToDelete) {
      return;
    }
    setResourceToDelete(null);
  };

  return (
    <DeleteDialog
      open={!!resourceToDelete}
      onOpenChange={(open) => !open && setResourceToDelete(null)}
      entityToDelete={resourceToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="resources"
    />
  );
}
