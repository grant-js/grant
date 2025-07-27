'use client';

import { X, Pencil, UserPlus, MoreVertical, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { User } from '@/graphql/generated/types';
import { CreateUserDialog } from './CreateUserDialog';
import { ColoredList } from '@/components/ui/colored-list';
import { EmptyState } from '@/components/ui/empty-state';
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
  search: string;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserTable({ users, loading, search, onEditClick, onDeleteClick }: UserTableProps) {
  const t = useTranslations('users');

  return (
    <>
      <div className="w-full px-4">
        <div className="space-y-4">
          {users.length === 0 && !loading ? (
            <EmptyState
              icon={<UserPlus className="h-12 w-12" />}
              title={search ? t('noSearchResults.title') : t('noUsers.title')}
              description={search ? t('noSearchResults.description') : t('noUsers.description')}
              action={search ? undefined : <CreateUserDialog />}
            />
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
                          <ColoredList
                            items={user.roles}
                            labelField="name"
                            title=""
                            icon={<Shield className="h-3 w-3" />}
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
    </>
  );
}
