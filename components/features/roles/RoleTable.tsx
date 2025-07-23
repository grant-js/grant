'use client';

import { X, Pencil, UserPlus, MoreVertical, Group } from 'lucide-react';
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
import { Role } from '@/graphql/generated/types';
import { EditRoleDialog } from './EditRoleDialog';
import { CreateRoleDialog } from './CreateRoleDialog';
import { ColoredList } from '@/components/common/ColoredList';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RoleTableProps {
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

export function RoleTable({
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
}: RoleTableProps) {
  const t = useTranslations('roles');

  return (
    <>
      <div className="w-full px-4">
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
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.label')}</TableHead>
                    <TableHead>{t('table.description')}</TableHead>
                    <TableHead>{t('groups')}</TableHead>
                    <TableHead className="w-[100px]">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        {t('table.loading')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description || t('noDescription')}</TableCell>
                        <TableCell>
                          <ColoredList
                            items={role.groups}
                            labelField="name"
                            title=""
                            icon={<Group className="h-3 w-3" />}
                            height={60}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
