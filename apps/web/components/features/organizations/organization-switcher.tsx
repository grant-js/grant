'use client';

import { useEffect, useMemo, useState } from 'react';

import { redirect, useParams } from 'next/navigation';

import { OrganizationSortableField, SortOrder } from '@grantjs/schema';
import { Building2, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizations } from '@/hooks/organizations';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);

  const scope = useAccountScope();

  const currentOrganizationId = params.organizationId as string;

  const { organizations, loading, error } = useOrganizations({
    scope: scope!,
    limit: -1,
    sort: { field: OrganizationSortableField.Name, order: SortOrder.Asc },
  });

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

    const newPath = `/${locale}/dashboard/organizations/${organizationId}/projects`;
    if (pathname !== newPath) {
      redirect(newPath);
    }
  };

  const organizationName = loading
    ? t('loading')
    : error
      ? t('error')
      : selectedOrganization
        ? selectedOrganization.name
        : t('organizations.select');

  const popoverContent = (
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
  );

  return (
    <SidebarPopover
      icon={<Building2 />}
      title={organizationName}
      label={t('organizations.organization')}
      content={popoverContent}
      buttonProps={{
        size: 'lg',
        className: cn('!px-1 h-12', className),
        disabled: loading,
      }}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
