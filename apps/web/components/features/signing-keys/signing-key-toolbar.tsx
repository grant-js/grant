'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Scope, Tenant } from '@grantjs/schema';
import { Plus, RotateCw } from 'lucide-react';

import { PageTableColumnToggle, RefreshButton, Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useScopeFromParams } from '@/hooks/common';
import { useSigningKeyMutations } from '@/hooks/signing-keys';
import { cn } from '@/lib/utils';
import { useSigningKeysStore } from '@/stores/signing-keys.store';

import { SigningKeyRotateDialog } from './signing-key-rotate-dialog';
import { SigningKeyViewSwitcher } from './signing-key-view-switcher';

/**
 * Toolbar for the signing keys page. Uses store for refetch/loading (set by SigningKeyViewer).
 * When no keys exist: "Create signing key" + Plus. When keys exist: "Rotate key" + RotateCw.
 * Dialog open state is in store so the empty-state action can open it.
 */
export function SigningKeyToolbar() {
  const t = useTranslations('signingKeys.toolbar');
  const scope = useScopeFromParams();
  const refetch = useSigningKeysStore((state) => state.refetch);
  const loading = useSigningKeysStore((state) => state.loading);
  const hasKeys = useSigningKeysStore((state) => state.hasKeys);
  const rotateDialogOpen = useSigningKeysStore((state) => state.rotateDialogOpen);
  const setRotateDialogOpen = useSigningKeysStore((state) => state.setRotateDialogOpen);

  const [rotating, setRotating] = useState(false);

  const { rotateSigningKey } = useSigningKeyMutations();

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });
  const isProjectScope =
    scope?.tenant === Tenant.AccountProject || scope?.tenant === Tenant.OrganizationProject;

  const handleCreateOrRotateClick = useCallback(() => {
    setRotateDialogOpen(true);
  }, [setRotateDialogOpen]);

  const handleRotateConfirm = useCallback(
    async (s: Scope) => {
      setRotating(true);
      try {
        await rotateSigningKey(s);
        refetch?.();
      } finally {
        setRotating(false);
      }
    },
    [rotateSigningKey, refetch]
  );

  if (!scope || !canQuery || !isProjectScope) {
    return null;
  }

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <PageTableColumnToggle key="columns" />,
    <SigningKeyViewSwitcher key="view" />,
    hasKeys ? (
      <Tooltip key="rotate">
        <TooltipTrigger asChild>
          <Button
            className={cn(
              'w-full sm:w-auto',
              'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
              'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none'
            )}
            onClick={handleCreateOrRotateClick}
            disabled={loading || rotating}
            aria-label={t('rotate')}
          >
            <RotateCw className={cn('size-4 shrink-0', rotating && 'animate-spin')} />
            <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
              {t('rotate')}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t('rotate')}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip key="create">
        <TooltipTrigger asChild>
          <Button
            className={cn(
              'w-full sm:w-auto',
              'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
              'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none'
            )}
            onClick={handleCreateOrRotateClick}
            disabled={loading || rotating}
            aria-label={t('create')}
          >
            <Plus className={cn('size-4 shrink-0', rotating && 'animate-spin')} />
            <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
              {t('create')}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t('create')}</p>
        </TooltipContent>
      </Tooltip>
    ),
  ];

  return (
    <>
      <Toolbar items={toolbarItems} />
      <SigningKeyRotateDialog
        scope={scope}
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        onConfirm={handleRotateConfirm}
        loading={rotating}
        isCreate={!hasKeys}
      />
    </>
  );
}
