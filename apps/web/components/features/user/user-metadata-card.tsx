'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, User } from '@grantjs/schema';
import { Info } from 'lucide-react';

import { FeatureModuleCard, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProjectUserScope, useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { getCurrentUserId } from '@/lib/auth';
import { getDocsUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

function isProjectMembershipMetadataScope(scope: { tenant: Tenant } | null | undefined): boolean {
  if (!scope) return false;
  return (
    scope.tenant === Tenant.AccountProject ||
    scope.tenant === Tenant.OrganizationProject ||
    scope.tenant === Tenant.AccountProjectUser ||
    scope.tenant === Tenant.OrganizationProjectUser
  );
}

interface UserMetadataCardProps {
  user: User;
  onAfterUserMutation?: () => void | Promise<unknown>;
}

export function UserMetadataCard({ user, onAfterUserMutation }: UserMetadataCardProps) {
  const t = useTranslations('user.info');
  const tUsers = useTranslations('users.form');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const projectScope = useProjectUserScope();
  const mutationScope = projectScope ?? scope;
  const { updateUser } = useUserMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionUserId = useMemo(
    () => (accessToken ? getCurrentUserId(accessToken) : null),
    [accessToken]
  );
  const isSelf = sessionUserId !== null && sessionUserId === user.id;
  const isSelfManagedMember = (user.authenticationMethods?.length ?? 0) > 0;

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: mutationScope!,
  });
  const canEditProjectMetadata = canUpdate && !(isSelf && isSelfManagedMember);

  const metadataValue =
    user.metadata != null && typeof user.metadata === 'object' && !Array.isArray(user.metadata)
      ? user.metadata
      : user.metadata != null && typeof user.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(user.metadata as string) as object;
            } catch {
              return {};
            }
          })()
        : {};

  const [metadataDraft, setMetadataDraft] = useState<object>(metadataValue);

  useEffect(() => {
    setMetadataDraft(metadataValue);
  }, [user.id, user.metadata]);

  const isMetadataDraftValid =
    metadataDraft &&
    typeof metadataDraft === 'object' &&
    !Array.isArray(metadataDraft) &&
    !('__invalidJson' in metadataDraft);
  const isMetadataUnchanged = JSON.stringify(metadataValue) === JSON.stringify(metadataDraft);

  const handleReset = () => setMetadataDraft(metadataValue);

  const handleSave = async () => {
    if (!mutationScope || !isMetadataDraftValid) return;
    setIsSubmitting(true);
    try {
      await updateUser(user.id, {
        scope: mutationScope,
        metadata: metadataDraft as Record<string, unknown>,
      });
      await onAfterUserMutation?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={t('metadata')}
      description={t('metadataDescription')}
      collapsible
      titleAdornment={
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Field information"
            >
              <Info className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 z-[99999999]" align="start">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{tUsers('metadataInfo')}</p>
              {isProjectMembershipMetadataScope(scope) && (
                <p className="text-sm text-muted-foreground">{tUsers('metadataProjectContext')}</p>
              )}
              <a
                href={`${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {tUsers('metadataDocsLink')}
              </a>
            </div>
          </PopoverContent>
        </Popover>
      }
      footer={
        canEditProjectMetadata ? (
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isMetadataUnchanged || isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !isMetadataDraftValid || isMetadataUnchanged}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <JsonEditor
        value={metadataDraft}
        onChange={(value) => setMetadataDraft(value ?? {})}
        disabled={!canEditProjectMetadata}
        className="min-h-[160px]"
      />
    </FeatureModuleCard>
  );
}
