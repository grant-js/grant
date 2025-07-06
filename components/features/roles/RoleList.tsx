'use client';

import { X, Pencil, UserPlus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { EditRoleDialog } from './EditRoleDialog';
import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleCardSkeleton } from './RoleCardSkeleton';
import { Role } from '@/graphql/generated/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface RoleListProps {
  limit: number;
  roles: Role[];
  loading: boolean;
  onEditClick: (role: Role) => void;
  onDeleteClick: (role: Role) => void;
  roleToDelete: { id: string; name: string } | null;
  roleToEdit: Role | null;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  onEditClose: () => void;
  currentPage: number;
}

export function RoleList({
  limit,
  roles,
  loading,
  onEditClick,
  onDeleteClick,
  roleToDelete,
  roleToEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onEditClose,
  currentPage,
}: RoleListProps) {
  const t = useTranslations('roles');

  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {roles.length === 0 && !loading ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-500">{t('noRoles.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('noRoles.description')}</p>
              <div className="mt-6">
                <CreateRoleDialog />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {loading ? (
                <>
                  {Array.from({ length: limit }).map((_, i) => (
                    <RoleCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                roles.map((role) => (
                  <div key={role.id} className="group relative h-full">
                    <Card className="h-full">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                            <span className="text-sm font-medium text-white">
                              {role.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{role.name}</CardTitle>
                            <CardDescription className="truncate">
                              {role.description || t('noDescription')}
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditClick(role)}>
                              <Pencil className="mr-2 size-4" />
                              {t('actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteClick(role)}
                            >
                              <X className="mr-2 size-4" />
                              {t('actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {role.id}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!roleToDelete} onOpenChange={onDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: roleToDelete?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm}>
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditRoleDialog
        role={roleToEdit}
        open={!!roleToEdit}
        onOpenChange={(open) => !open && onEditClose()}
        currentPage={currentPage}
      />
    </>
  );
}
