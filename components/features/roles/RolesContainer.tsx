'use client';

import { useMutation } from '@apollo/client';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Role, RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';
import { evictRolesCache } from './cache';
import { DELETE_ROLE } from './mutations';
import { useTranslations } from 'next-intl';
import { useRoles } from '@/hooks/useRoles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditRoleDialog } from './EditRoleDialog';

interface RolesContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: RoleSortableField;
    order: RoleSortOrder;
  };
  onTotalCountChange?: (totalCount: number) => void;
  children: (props: {
    limit: number;
    roles: Role[];
    loading: boolean;
    search: string;
    onEditClick: (role: Role) => void;
    onDeleteClick: (role: Role) => void;
  }) => React.ReactNode;
}

export function RolesContainer({
  page,
  limit,
  search,
  sort,
  onTotalCountChange,
  children,
}: RolesContainerProps) {
  const { roles, loading, error, totalCount } = useRoles({
    page,
    limit,
    search,
    sort,
  });

  const [deleteRole] = useMutation<{
    deleteRole: boolean;
  }>(DELETE_ROLE, {
    update(cache) {
      evictRolesCache(cache);
      cache.gc();
    },
  });

  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const t = useTranslations('roles');

  // Update parent with total count when data changes
  useEffect(() => {
    if (totalCount) {
      onTotalCountChange?.(totalCount);
    }
  }, [totalCount, onTotalCountChange]);

  const handleDelete = useCallback(async () => {
    if (!roleToDelete) return;

    try {
      await deleteRole({
        variables: { id: roleToDelete.id },
      });
      toast.success(t('notifications.deleteSuccess'), {
        description: `${roleToDelete.name} has been removed from the system`,
      });

      // Note: The useRoles hook will automatically refetch when the cache is evicted
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setRoleToDelete(null);
    }
  }, [roleToDelete, deleteRole, t]);

  const handleEditClick = useCallback((role: Role) => {
    setRoleToEdit(role);
  }, []);

  const handleDeleteClick = useCallback((role: Role) => {
    setRoleToDelete({ id: role.id, name: role.name });
  }, []);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      {children({
        limit,
        roles,
        loading,
        search,
        onEditClick: handleEditClick,
        onDeleteClick: handleDeleteClick,
      })}

      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: roleToDelete?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditRoleDialog
        role={roleToEdit}
        open={!!roleToEdit}
        onOpenChange={(open) => !open && setRoleToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
