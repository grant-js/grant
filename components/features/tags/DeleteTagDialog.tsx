'use client';

import { DeleteDialog } from '@/components/common/DeleteDialog';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useTagMutations } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

export function DeleteTagDialog() {
  const scope = useScopeFromParams();
  const { handleDeleteTag } = useTagMutations();
  const tagToDelete = useTagsStore((state) => state.tagToDelete);
  const setTagToDelete = useTagsStore((state) => state.setTagToDelete);

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
