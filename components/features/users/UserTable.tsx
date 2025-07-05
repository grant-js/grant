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
import { User } from '@/graphql/generated/types';
import { EditUserDialog } from './EditUserDialog';
import { CreateUserDialog } from './CreateUserDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
  userToDelete: { id: string; name: string } | null;
  userToEdit: User | null;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  onEditClose: () => void;
  currentPage: number;
}

export function UserTable({
  users,
  loading,
  onEditClick,
  onDeleteClick,
  userToDelete,
  userToEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onEditClose,
  currentPage,
}: UserTableProps) {
  const t = useTranslations('users');

  return (
    <>
      <div className="w-full px-4">
        <div className="space-y-4">
          {users.length === 0 && !loading ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-500">{t('noUsers.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('noUsers.description')}</p>
              <div className="mt-6">
                <CreateUserDialog />
              </div>
            </div>
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.email')}</TableHead>
                    <TableHead>{t('table.roles')}</TableHead>
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
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role.id}
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                  role.id === 'admin'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                )}
                              >
                                {role.label}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditClick(user)}>
                                <Pencil className="mr-2 size-4" />
                                {t('actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDeleteClick(user)}
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

      <AlertDialog open={!!userToDelete} onOpenChange={onDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: userToDelete?.name || '' })}
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

      <EditUserDialog
        user={userToEdit}
        open={!!userToEdit}
        onOpenChange={(open) => !open && onEditClose()}
        currentPage={currentPage}
      />
    </>
  );
}
