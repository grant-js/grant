'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useTagMutations } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

export function TagDeleteDialog() {
  const scope = useScopeFromParams();
  const { handleDeleteTag } = useTagMutations();
  const tagToDelete = useTagsStore((state) => state.tagToDelete);
  const setTagToDelete = useTagsStore((state) => state.setTagToDelete);

  const canDelete = useGrant(ResourceSlug.Tag, ResourceAction.Delete, {
    scope: scope!,
    context: tagToDelete
      ? { resource: { id: tagToDelete.id, scope: { tags: [tagToDelete.id] } } }
      : undefined,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canDelete || requiresEmailVerification) {
    return null;
  }

  const handleDelete = async (id: string, tagName: string) => {
    await handleDeleteTag({ id, scope: scope! }, tagName);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTagToDelete(null);
    }
  };

  return (
    <DeleteDialog
      entityToDelete={tagToDelete}
      open={!!tagToDelete}
      onOpenChange={handleOpenChange}
      title="deleteDialog.title"
      description="deleteDialog.description"
      confirmText="deleteDialog.confirm"
      cancelText="deleteDialog.cancel"
      onDelete={handleDelete}
      translationNamespace="tags"
      deletingText="deleteDialog.deleting"
    />
  );
}
