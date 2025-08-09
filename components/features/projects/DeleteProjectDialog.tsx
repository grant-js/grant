'use client';

import { DeleteDialog } from '@/components/common';
import { useOrganizationProjectMutations } from '@/hooks';
import { useProjectMutations } from '@/hooks/projects';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';

export function DeleteProjectDialog() {
  const projectToDelete = useProjectsStore((state) => state.projectToDelete);
  const selectedOrganizationId = useOrganizationsStore((state) => state.selectedOrganizationId);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);
  const { deleteProject } = useProjectMutations();
  const { removeOrganizationProject } = useOrganizationProjectMutations();

  const handleDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id, projectToDelete.name);
    await removeOrganizationProject({
      organizationId: selectedOrganizationId as string,
      projectId: projectToDelete.id,
    });
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
