'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';
import { Pencil } from 'lucide-react';

import { Avatar } from '@/components/common';
import type { AvatarProps } from '@/components/common/common-types';
import { Button } from '@/components/ui/button';
import { useEmailVerified } from '@/hooks/auth';
import { getInitials } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationAvatarProps {
  organization: Organization;
  size?: AvatarProps['size'];
  interactive?: boolean;
  className?: string;
}

export function OrganizationAvatar({
  organization,
  size = 'md',
  interactive = false,
  className,
}: OrganizationAvatarProps) {
  const t = useTranslations('organizations.avatar');
  const isEmailVerified = useEmailVerified();
  const setOrganizationForPictureUpload = useOrganizationsStore(
    (state) => state.setOrganizationForPictureUpload
  );

  const scope = organization.id ? { tenant: Tenant.Organization, id: organization.id } : null;
  const canUpload = useGrant(ResourceSlug.Organization, ResourceAction.UploadPicture, {
    scope,
    enabled: interactive && !!scope,
  });

  const showUploadOverlay = interactive && canUpload && isEmailVerified;
  const initials = getInitials(organization.name, 2, 'O');

  return (
    <div className="relative shrink-0 group/avatar">
      <Avatar
        initial={initials}
        imageUrl={organization.pictureUrl || undefined}
        cacheBuster={organization.updatedAt}
        size={size}
        className={className}
      />
      {showUploadOverlay ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOrganizationForPictureUpload(organization);
          }}
          aria-label={organization.pictureUrl ? t('changeButton') : t('uploadButton')}
        >
          <Pencil className={size === 'xl' ? 'h-5 w-5 text-white' : 'h-4 w-4 text-white'} />
        </Button>
      ) : null}
    </div>
  );
}
