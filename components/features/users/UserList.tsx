'use client';

import { gql, useQuery, useMutation } from '@apollo/client';
import { X, Pencil, UserPlus, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
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
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { EditUserDialog } from './EditUserDialog';
import { CreateUserDialog } from './CreateUserDialog';
import { UserCardSkeleton } from './UserCardSkeleton';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { User, UsersQueryResult } from './types';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { evictUsersCache } from './cache';

export const GET_USERS = gql`
  query GetUsers($page: Int!, $limit: Int!, $sort: UserSortInput, $search: String) {
    users(page: $page, limit: $limit, sort: $sort, search: $search) {
      users {
        id
        name
        email
        roles {
          id
          label
        }
      }
      totalCount
      hasNextPage
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      name
      email
      roles {
        id
        label
      }
    }
  }
`;

interface UserListProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: UserSortableField;
    order: UserSortOrder;
  };
  onPageChange: (page: number) => void;
}

export function UserList({ page, limit, search, sort, onPageChange }: UserListProps) {
  const queryVariables = useMemo(
    () => ({
      page,
      limit,
      sort,
      search,
    }),
    [page, limit, sort, search]
  );

  const { loading, error, data, refetch } = useQuery<UsersQueryResult>(GET_USERS, {
    variables: queryVariables,
  });

  const [deleteUser] = useMutation<{
    deleteUser: User;
  }>(DELETE_USER, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const t = useTranslations('users');

  // Memoize derived values and callbacks
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.users.totalCount / limit));
  }, [data?.users.totalCount, limit]);

  const handleDelete = useCallback(async () => {
    if (!userToDelete || !data) return;

    try {
      await deleteUser({
        variables: { id: userToDelete.id },
      });
      toast.success(t('notifications.deleteSuccess'), {
        description: `${userToDelete.name} has been removed from the system`,
      });

      // Refetch the current page to get the updated list
      await refetch();

      // If we're on a page greater than 1 and this was the last user on the current page,
      // navigate to the previous page
      if (page > 1 && data.users.users.length === 1) {
        onPageChange(page - 1);
      }
      // If we're on the last page and it becomes empty, go back one page
      else if (page === totalPages && data.users.users.length === 1) {
        onPageChange(page - 1);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setUserToDelete(null);
    }
  }, [userToDelete, deleteUser, refetch, page, data, totalPages, onPageChange, t]);

  const handleEditClick = useCallback((user: User) => {
    setUserToEdit(user);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setUserToDelete({ id: user.id, name: user.name });
  }, []);

  const handlePreviousPage = useCallback(() => {
    onPageChange(page - 1);
  }, [page, onPageChange]);

  const handleNextPage = useCallback(() => {
    onPageChange(page + 1);
  }, [page, onPageChange]);

  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  const { users, hasNextPage } = data.users;

  return (
    <>
      <div className="max-w-5xl mx-auto p-4">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {loading
                  ? Array.from({ length: limit }).map((_, index) => (
                      <UserCardSkeleton key={index} />
                    ))
                  : users.map((user: User) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm md:text-base truncate">
                              {user.name}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.roles.map((role: { id: string; label: string }) => (
                                <span
                                  key={role.id}
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                    role.id === 'admin'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  )}
                                >
                                  {t(`roles.${role.id}`)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-accent dark:hover:bg-white/10"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(user)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(user)}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {users.length > 0 && (
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
          <div className="mx-auto p-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handlePreviousPage} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('pagination.previous')}
              </Button>
              <span className="text-sm text-gray-500">
                {t('pagination.info', { current: page, total: totalPages })}
              </span>
              <Button variant="outline" onClick={handleNextPage} disabled={!hasNextPage}>
                {t('pagination.next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: userToDelete?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditUserDialog
        user={userToEdit}
        open={!!userToEdit}
        onOpenChange={(open) => !open && setUserToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
