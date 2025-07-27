'use client';

import { X, Pencil, UserPlus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CreateUserDialog } from './CreateUserDialog';
import { UserCardSkeleton } from './UserCardSkeleton';
import { User } from '@/graphql/generated/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ColoredList } from '@/components/ui/colored-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Shield } from 'lucide-react';

interface UserCardsProps {
  limit: number;
  users: User[];
  loading: boolean;
  search: string;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserCards({
  limit,
  users,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: UserCardsProps) {
  const t = useTranslations('users');

  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {users.length === 0 && !loading ? (
            <EmptyState
              icon={<UserPlus className="h-12 w-12" />}
              title={search ? t('noSearchResults.title') : t('noUsers.title')}
              description={search ? t('noSearchResults.description') : t('noUsers.description')}
              action={search ? undefined : <CreateUserDialog />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {loading ? (
                <>
                  {Array.from({ length: limit }).map((_, i) => (
                    <UserCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="group relative h-full">
                    <Card className="h-full gap-1">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
                        <div className="flex items-start gap-4 min-w-0">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                              user.roles.some((role) => role.id === 'admin')
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            )}
                          >
                            <span className="text-sm font-medium text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{user.name}</CardTitle>
                            <CardDescription className="truncate">{user.email}</CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ColoredList
                          items={user.roles}
                          labelField="name"
                          title={t('form.roles')}
                          icon={<Shield className="h-3 w-3" />}
                          height={80}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
