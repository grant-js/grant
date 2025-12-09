'use client';

import * as React from 'react';
import { useEffect, useMemo } from 'react';

import { redirect, useParams } from 'next/navigation';

import { OrganizationSortableField, SortOrder } from '@logusgraphics/grant-schema';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOrganizations } from '@/hooks/organizations/useOrganizations';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = React.useState(false);

  const currentOrganizationId = params.organizationId as string;

  const { organizations, loading, error } = useOrganizations({
    limit: -1,
    sort: { field: OrganizationSortableField.Name, order: SortOrder.Asc },
  });

  const isProjectPage = !!params.projectId;
  const isOrganizationPage = !!params.organizationId;
  const setCurrentOrganization = useOrganizationsStore((state) => state.setCurrentOrganization);

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === currentOrganizationId),
    [organizations, currentOrganizationId]
  );

  useEffect(() => {
    setCurrentOrganization(selectedOrganization || null);
    return () => {
      setCurrentOrganization(null);
    };
  }, [selectedOrganization, setCurrentOrganization]);

  const handleOrganizationSelect = (organizationId: string) => {
    setOpen(false);

    const newPath = `/dashboard/organizations/${organizationId}/projects`;
    if (pathname !== newPath) {
      redirect(newPath);
    }
  };

  if (!isProjectPage && !isOrganizationPage) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={loading}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm shrink-0">Org:</span>
            <span className="truncate min-w-0">
              {loading
                ? t('loading')
                : error
                  ? t('error')
                  : selectedOrganization
                    ? selectedOrganization.name
                    : t('organizations.select')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={t('organizations.search')} />
          <CommandList>
            <CommandEmpty>{t('organizations.notFound')}</CommandEmpty>
            <CommandGroup>
              {organizations.map((organization) => (
                <CommandItem
                  key={organization.id}
                  value={organization.name}
                  onSelect={() => handleOrganizationSelect(organization.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentOrganizationId === organization.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {organization.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
