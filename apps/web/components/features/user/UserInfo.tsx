'use client';

import { useState } from 'react';

import { User } from '@logusgraphics/grant-schema';
import { Calendar, Fingerprint, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { CopyToClipboard } from '@/components/common/CopyToClipboard';
import { ImageUploadDialog } from '@/components/settings/ImageUploadDialog';
import { Button } from '@/components/ui/button';
import { EditableText } from '@/components/ui/editable-text';
import { useUserMutations } from '@/hooks/users/useUserMutations';
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

export function UserInfo({ user, onPictureUpdate }: UserInfoProps) {
  const t = useTranslations('user.info');
  const { uploadUserPicture, updateUser } = useUserMutations();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const handleUploadPicture = async (file: string, filename: string, contentType: string) => {
    await uploadUserPicture({
      userId: user.id,
      file,
      filename,
      contentType,
    });
    onPictureUpdate?.();
  };

  const validPictureUrl = isValidImageUrl(user.pictureUrl) ? user.pictureUrl : undefined;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start gap-6">
        <div className="relative group">
          <Avatar
            initial={getInitials(user.name)}
            imageUrl={validPictureUrl}
            cacheBuster={user.updatedAt}
            size="lg"
            className="h-24 w-24"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover:opacity-100 bg-black/50 hover:bg-black/60"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Pencil className="h-5 w-5 text-white" />
          </Button>
        </div>
        <div className="flex-1 space-y-2">
          <EditableText
            value={user.name || ''}
            onConfirm={async (newName: string) => {
              await updateUser(user.id, { name: newName });
            }}
            className="text-2xl font-semibold"
            inputClassName="text-2xl font-semibold"
            placeholder="User name"
          />
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-sm">
              <Fingerprint className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t('userId')}:</span>
              <span className="font-semibold">{user.id}</span>
              <CopyToClipboard text={user.id} size="sm" variant="ghost" />
            </div>
            <div className="inline-flex items-center gap-4 text-sm">
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t('created')}:</span>
                <span className="font-semibold">
                  {new Date(user.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t('updated')}:</span>
                <span className="font-semibold">
                  {new Date(user.updatedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleUploadPicture}
        currentImageUrl={validPictureUrl}
      />
    </div>
  );
}
