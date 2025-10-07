'use client';

import { DeleteDialog } from '@/components/common';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { useProjectMutations } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

export function DeleteProjectDialog() {
  const scope = useProjectScope();
  const organizationId = scope!.id;
  const projectToDelete = useProjectsStore((state) => state.projectToDelete);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);
  const { deleteProject } = useProjectMutations();

  const handleDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id, organizationId, projectToDelete.name);
    setProjectToDelete(null);
  };

  return (
    <DeleteDialog
      open={!!projectToDelete}
      onOpenChange={(open) => !open && setProjectToDelete(null)}
      entityToDelete={projectToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="projects"
    />
  );
}
