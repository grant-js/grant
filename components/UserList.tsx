'use client';

import { gql, useQuery, useMutation } from '@apollo/client';
import { X, Pencil, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { EditUserDialog } from './EditUserDialog';
import { CreateUserDialog } from './CreateUserDialog';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const GET_USERS = gql`
  query GetUsers($page: Int!, $limit: Int!) {
    users(page: $page, limit: $limit) {
      users {
        id
        name
        email
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
    }
  }
`;

export function UserList() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { loading, error, data } = useQuery(GET_USERS, {
    variables: { page, limit },
  });
  const [deleteUser] = useMutation(DELETE_USER, {
    refetchQueries: [
      {
        query: GET_USERS,
        variables: {
          page: page,
          limit: 10,
        },
      },
    ],
  });
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToEdit, setUserToEdit] = useState<{ id: string; name: string; email: string } | null>(
    null
  );
  const t = useTranslations('users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { users, totalCount, hasNextPage } = data.users;
  const totalPages = Math.ceil(totalCount / limit);

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser({
        variables: { id: userToDelete.id },
      });
      toast.success(t('notifications.deleteSuccess'), {
        description: `${userToDelete.name} has been removed from the system`,
      });
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
                {users.map((user: { id: string; name: string; email: string }) => (
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setUserToEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('actions.edit')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('actions.delete')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>

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
