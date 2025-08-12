'use client';

import * as React from 'react';

import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { useParams } from 'next/navigation';
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
import { OrganizationSortableField, OrganizationSortOrder } from '@/graphql/generated/types';
import { useOrganizations } from '@/hooks/organizations/useOrganizations';
import { useRouter, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = React.useState(false);

  const { selectedOrganizationId, setSelectedOrganizationId } = useOrganizationsStore();

  // Load all organizations with limit -1 (always call this hook)
  const { organizations, loading, error } = useOrganizations({
    limit: -1,
    sort: { field: OrganizationSortableField.Name, order: OrganizationSortOrder.Asc },
  });

  // Only show on project pages or organization pages
  const isProjectPage = !!params.projectId;
  const isOrganizationPage = !!params.organizationId;

  if (!isProjectPage && !isOrganizationPage) {
    return null;
  }

  const selectedOrganization = organizations.find((org) => org.id === selectedOrganizationId);

  const handleOrganizationSelect = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setOpen(false);

    // Redirect to the organization's projects page
    const newPath = `/dashboard/org/${organizationId}/projects`;
    if (pathname !== newPath) {
      router.replace(newPath);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[220px] justify-between', className)}
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
      <PopoverContent className="w-[220px] p-0">
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
                      selectedOrganizationId === organization.id ? 'opacity-100' : 'opacity-0'
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
