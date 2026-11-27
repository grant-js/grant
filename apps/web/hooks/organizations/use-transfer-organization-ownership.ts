import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useGrantClientOptional } from '@grantjs/client/react';
import {
  OrganizationOwnershipTransfer,
  TransferOrganizationOwnershipDocument,
  TransferOrganizationOwnershipInput,
} from '@grantjs/schema';
import { toast } from 'sonner';

import { evictMembersAndInvitationsCache } from '@/hooks/members/cache';

import { evictOrganizationsCache } from './cache';

/** API `reason` code of a refused transfer, mapped to its i18n key under `ownership.errors`. */
const REASON_MESSAGE_KEYS: Record<string, string> = {
  OWNERSHIP_TRANSFER_NOT_OWNER: 'notOwner',
  OWNERSHIP_TRANSFER_SESSION_REQUIRED: 'sessionRequired',
  OWNERSHIP_TRANSFER_SELF: 'self',
  OWNERSHIP_TRANSFER_INVALID_SELECTION: 'invalidSelection',
  OWNERSHIP_TRANSFER_INVALID_ROLE: 'invalidRole',
  OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER: 'targetNotMember',
  OWNERSHIP_TRANSFER_TARGET_DEACTIVATED: 'targetDeactivated',
  OWNERSHIP_TRANSFER_TARGET_UNVERIFIED: 'targetUnverified',
  MFA_REQUIRED: 'mfaRequired',
};

/** The first GraphQL error `reason` an Apollo error carries, if any. */
export function getTransferErrorReason(error: unknown): string | null {
  const errors = (error as { errors?: ReadonlyArray<{ extensions?: { reason?: unknown } }> })
    ?.errors;
  for (const graphQLError of errors ?? []) {
    const reason = graphQLError.extensions?.reason;
    if (typeof reason === 'string') return reason;
  }
  return null;
}

export function useTransferOrganizationOwnership() {
  const t = useTranslations('organizations.settings.ownership');
  const grant = useGrantClientOptional();

  const [transfer] = useMutation<{ transferOrganizationOwnership: OrganizationOwnershipTransfer }>(
    TransferOrganizationOwnershipDocument,
    {
      update: (cache: ApolloCache) => {
        evictOrganizationsCache(cache);
        evictMembersAndInvitationsCache(cache);
      },
    }
  );

  const transferOwnership = async (input: TransferOrganizationOwnershipInput) => {
    try {
      const result = await transfer({ variables: { input } });
      // Everyone's roles in this organization changed: drop the cached permission checks.
      grant?.clearCache();
      toast.success(
        input.leaveOrganization ? t('notifications.successLeft') : t('notifications.success')
      );
      return result.data?.transferOrganizationOwnership;
    } catch (error) {
      console.error('Error transferring organization ownership:', error);
      const reason = getTransferErrorReason(error);
      const key = reason ? REASON_MESSAGE_KEYS[reason] : undefined;
      toast.error(t('notifications.error'), {
        description: key
          ? t(`errors.${key}`)
          : error instanceof Error
            ? error.message
            : t('errors.generic'),
      });
      throw error;
    }
  };

  return { transferOwnership };
}
