'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Check,
  Fingerprint,
  GitBranch,
  Info,
  LogIn,
  Mail,
  Pencil,
  X,
} from 'lucide-react';

import { Avatar, CopyToClipboard, EditableText, JsonEditor } from '@/components/common';
import { SettingImageUploadDialog } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useScopeFromParams } from '@/hooks';
import { useUserMutations } from '@/hooks/users';
import { getDocsUrl } from '@/lib/constants';
import { getInitials } from '@/lib/utils';

interface UserInfoProps {
  user: User;
  onPictureUpdate?: () => void;
}

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  const trimmedUrl = url.trim();
  return (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('/')
  );
}

function getAuthMethodIcon(provider: string): LucideIcon {
  switch (provider.toLowerCase()) {
    case 'email':
      return Mail;
    case 'github':
      return GitBranch;
    default:
      return LogIn;
  }
}

export function UserInfo({ user, onPictureUpdate }: UserInfoProps) {
  const t = useTranslations('user.info');
  const tUsers = useTranslations('users.form');
  const tProjectApps = useTranslations('projectApps');
  const scope = useScopeFromParams();
  const { uploadUserPicture, updateUser } = useUserMutations();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isMetadataEditing, setIsMetadataEditing] = useState(false);
  const [isMetadataSubmitting, setIsMetadataSubmitting] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState<object>({});

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });
  const canUploadPicture = useGrant(ResourceSlug.User, ResourceAction.UploadPicture, {
    scope: scope!,
  });

  const handleUploadPicture = async (file: string, filename: string, contentType: string) => {
    await uploadUserPicture({
      scope: scope!,
      userId: user.id,
      file,
      filename,
      contentType,
    });
    onPictureUpdate?.();
  };

  const validPictureUrl = isValidImageUrl(user.pictureUrl) ? user.pictureUrl : undefined;

  const createdFormatted = new Date(user.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const updatedFormatted = new Date(user.updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

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

  const handleMetadataEditStart = () => {
    setMetadataDraft(metadataValue);
    setIsMetadataEditing(true);
  };

  const handleMetadataReset = () => {
    setMetadataDraft(metadataValue);
    setIsMetadataEditing(false);
  };

  const handleMetadataConfirm = async () => {
    const isValid =
      metadataDraft &&
      typeof metadataDraft === 'object' &&
      !Array.isArray(metadataDraft) &&
      !('__invalidJson' in metadataDraft);
    if (!isValid) return;

    setIsMetadataSubmitting(true);
    try {
      await updateUser(user.id, {
        scope: scope!,
        metadata: metadataDraft as Record<string, unknown>,
      });
      setIsMetadataEditing(false);
    } finally {
      setIsMetadataSubmitting(false);
    }
  };

  const isMetadataDraftValid =
    metadataDraft &&
    typeof metadataDraft === 'object' &&
    !Array.isArray(metadataDraft) &&
    !('__invalidJson' in metadataDraft);
  const isMetadataUnchanged = JSON.stringify(metadataValue) === JSON.stringify(metadataDraft);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex min-w-0 flex-col items-stretch gap-6 min-[1200px]:flex-row min-[1200px]:gap-8">
        {/* Left: avatar + main user data */}
        <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-6">
          {/* Avatar: 1/3 smaller on mobile so User ID fits; full size from md up */}
          <div className="relative shrink-0 group">
            <Avatar
              initial={getInitials(user.name)}
              imageUrl={validPictureUrl}
              cacheBuster={user.updatedAt}
              size="lg"
              className="h-16 w-16 md:h-24 md:w-24"
            />
            {canUploadPicture && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover:opacity-100 bg-black/50 hover:bg-black/60"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            )}
          </div>
          {/* Single column: name, User ID, then providers and audit below (same flow on mobile and desktop) */}
          <div className="min-w-0 flex-1 space-y-2">
            <EditableText
              value={user.name || ''}
              onConfirm={async (newName: string) => {
                await updateUser(user.id, { name: newName, scope: scope! });
              }}
              className="text-2xl font-semibold"
              inputClassName="text-2xl font-semibold"
              placeholder="User name"
              disabled={!canUpdate}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Fingerprint className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-muted-foreground">{t('userId')}:</span>
              <span className="min-w-0 truncate font-semibold">{user.id}</span>
              <CopyToClipboard text={user.id} size="sm" variant="ghost" className="shrink-0" />
            </div>
            {(user.authenticationMethods?.length ?? 0) > 0 &&
              user.authenticationMethods!.map((m) => {
                const Icon = getAuthMethodIcon(m.provider);
                return (
                  <div
                    key={`${m.provider}-${m.providerId}`}
                    className="inline-flex items-center gap-2 text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {tProjectApps(
                        `providers.${m.provider}` as 'providers.email' | 'providers.github'
                      )}
                      :
                    </span>
                    <span className="font-semibold">{m.providerId}</span>
                    <CopyToClipboard text={m.providerId} size="sm" variant="ghost" />
                  </div>
                );
              })}
            {/* createdAt and updatedAt: one row each on all devices */}
            <div className="flex flex-col gap-2 text-sm">
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t('created')}:</span>
                <span className="font-semibold">{createdFormatted}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t('updated')}:</span>
                <span className="font-semibold">{updatedFormatted}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Right: metadata (JSON editor) — side-by-side from 1200px up, stacked below on smaller */}
        <div className="min-w-0 flex-1 min-[1200px]:max-w-md">
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{t('metadata')}</p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Field information"
                >
                  <Info className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[99999999]" align="start">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tUsers('metadataInfo')}</p>
                  <a
                    href={`${getDocsUrl()}/core-concepts/permission-conditions#field-paths`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {tUsers('metadataDocsLink')}
                  </a>
                </div>
              </PopoverContent>
            </Popover>
            {canUpdate &&
              (isMetadataEditing ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={handleMetadataReset}
                    disabled={isMetadataSubmitting}
                    aria-label="Reset"
                  >
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={handleMetadataConfirm}
                    disabled={isMetadataSubmitting || !isMetadataDraftValid || isMetadataUnchanged}
                    aria-label="Confirm"
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleMetadataEditStart}
                  aria-label="Edit metadata"
                >
                  <Pencil className="size-3.5" />
                </Button>
              ))}
          </div>
          <JsonEditor
            value={isMetadataEditing ? metadataDraft : metadataValue}
            onChange={isMetadataEditing ? (value) => setMetadataDraft(value ?? {}) : undefined}
            disabled={!isMetadataEditing}
            className="min-h-[120px]"
          />
        </div>
      </div>

      <SettingImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleUploadPicture}
        currentImageUrl={validPictureUrl}
      />
    </div>
  );
}
