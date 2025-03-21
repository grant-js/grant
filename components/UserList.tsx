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
import { useState } from 'react';
import { toast } from 'sonner';
import { EditUserDialog } from './EditUserDialog';
import { CreateUserDialog } from './CreateUserDialog';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  label: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

export const GET_USERS = gql`
  query GetUsers($page: Int!, $limit: Int!) {
    users(page: $page, limit: $limit) {
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

export function UserList() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { loading, error, data } = useQuery<{
    users: {
      users: User[];
      totalCount: number;
      hasNextPage: boolean;
    };
  }>(GET_USERS, {
    variables: { page, limit },
  });
  const [deleteUser] = useMutation<{
    deleteUser: User;
  }>(DELETE_USER, {
    update(cache, { data }) {
      if (!data?.deleteUser) return;

      // Read the existing users query
      const existingUsers = cache.readQuery<{
        users: {
          users: User[];
          totalCount: number;
          hasNextPage: boolean;
        };
      }>({
        query: GET_USERS,
        variables: { page, limit },
      });

      if (existingUsers) {
        const newTotalCount = existingUsers.users.totalCount - 1;
        const newTotalPages = Math.ceil(newTotalCount / limit);
        const newHasNextPage = page < newTotalPages;

        // Update the current page
        cache.writeQuery({
          query: GET_USERS,
          variables: { page, limit },
          data: {
            users: {
              ...existingUsers.users,
              totalCount: newTotalCount,
              hasNextPage: newHasNextPage,
              users: existingUsers.users.users.filter((user) => user.id !== data.deleteUser.id),
            },
          },
        });

        // Update all other pages to reflect the new total count
        for (let p = 1; p <= newTotalPages; p++) {
          if (p !== page) {
            const otherPageData = cache.readQuery<{
              users: {
                users: User[];
                totalCount: number;
                hasNextPage: boolean;
              };
            }>({
              query: GET_USERS,
              variables: { page: p, limit },
            });

            if (otherPageData) {
              cache.writeQuery({
                query: GET_USERS,
                variables: { page: p, limit },
                data: {
                  users: {
                    ...otherPageData.users,
                    totalCount: newTotalCount,
                    hasNextPage: p < newTotalPages,
                  },
                },
              });
            }
          }
        }
      }
    },
  });
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const t = useTranslations('users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  const { users, totalCount, hasNextPage } = data.users;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser({
        variables: { id: userToDelete.id },
      });
      toast.success(t('notifications.deleteSuccess'), {
        description: `${userToDelete.name} has been removed from the system`,
      });

      // If we're on a page greater than 1 and this was the last user on the current page,
      // navigate to the previous page
      if (page > 1 && users.length === 1) {
        setPage(page - 1);
      }
      // If we're on the last page and it becomes empty, go back one page
      else if (page === totalPages && users.length === 1) {
        setPage(page - 1);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('notifications.deleteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto p-4">
        <div className="space-y-4">
          {users.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('noUsers.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('noUsers.description')}</p>
              <div className="mt-6">
                <CreateUserDialog currentPage={page} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm md:text-base truncate">{user.name}</h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
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
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                            className="text-red-600 focus:text-red-600"
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

              {totalCount > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t('pagination.previous')}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {t('pagination.info', { current: page, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNextPage}
                  >
                    {t('pagination.next')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {userToDelete && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteDialog.description', { name: userToDelete.name })}
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
      )}

      <EditUserDialog
        user={userToEdit}
        open={!!userToEdit}
        onOpenChange={(open) => !open && setUserToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
