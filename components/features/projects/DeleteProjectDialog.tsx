'use client';

import { DeleteDialog } from '@/components/common';
import { useOrganizationProjectMutations } from '@/hooks';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useProjectMutations } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

export function DeleteProjectDialog() {
  const scope = useScopeFromParams();
  const projectToDelete = useProjectsStore((state) => state.projectToDelete);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);
  const { deleteProject } = useProjectMutations();
  const { removeOrganizationProject } = useOrganizationProjectMutations();

  const handleDelete = async () => {
    if (!projectToDelete) return;
    await removeOrganizationProject({
      organizationId: scope.id,
      projectId: projectToDelete.id,
    });
    await deleteProject(projectToDelete.id, projectToDelete.name);
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
