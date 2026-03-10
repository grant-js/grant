'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

import { useParams } from 'next/navigation';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { OrganizationSortableField, SortOrder } from '@grantjs/schema';
import { Building2, Check, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizations } from '@/hooks/organizations';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationCreateDialog } from './organization-create-dialog';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const t = useTranslations('common');
  const tOrgs = useTranslations('organizations');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);

  const scope = useAccountScope();
  const setCreateDialogOpen = useOrganizationsStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Organization, ResourceAction.Create, {
    scope: scope!,
  });

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

  const handleCreateOrganization = useCallback(() => {
    setOpen(false);
    setCreateDialogOpen(true);
  }, [setCreateDialogOpen]);

  const handleOrganizationSelect = useCallback(
    (organizationId: string) => {
      setOpen(false);

      const newPath = `/dashboard/organizations/${organizationId}/projects`;
      if (pathname !== newPath) {
        router.push(newPath);
      }
    },
    [pathname, router]
  );

  const organizationName = loading
    ? t('loading')
    : error
      ? t('error')
      : selectedOrganization
        ? selectedOrganization.name
        : t('organizations.select');

  const isInsideOrg = !!currentOrganizationId;

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
        {canCreate && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="create-organization" onSelect={handleCreateOrganization}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {tOrgs('createDialog.trigger')}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );

  return (
    <>
      {canCreate && isInsideOrg && <OrganizationCreateDialog hideTrigger />}
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
    </>
  );
}
