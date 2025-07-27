'use client';

import { X, Pencil, Shield, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleCardSkeleton } from './RoleCardSkeleton';
import { Role } from '@/graphql/generated/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ColoredList } from '@/components/ui/colored-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Group } from 'lucide-react';

interface RoleCardsProps {
  limit: number;
  roles: Role[];
  loading: boolean;
  search: string;
  onEditClick: (role: Role) => void;
  onDeleteClick: (role: Role) => void;
}

export function RoleCards({
  limit,
  roles,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: RoleCardsProps) {
  const t = useTranslations('roles');

  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {roles.length === 0 && !loading ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title={search ? t('noSearchResults.title') : t('noRoles.title')}
              description={search ? t('noSearchResults.description') : t('noRoles.description')}
              action={search ? undefined : <CreateRoleDialog />}
            />
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
                    <Card className="h-full gap-1">
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
                        <ColoredList
                          items={role.groups}
                          labelField="name"
                          title={t('groups')}
                          icon={<Group className="h-3 w-3" />}
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
