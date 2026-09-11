'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Cropper, { Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDirectUploadMessage } from '@/hooks/common';
import { DirectUploadError } from '@/lib/direct-upload';
import { chooseOutputFormat, getCroppedImg, resizeImage } from '@/lib/utils/image-processing';

import { SettingImageUploadDialogProps } from './setting-types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const CROP_AREA_ASPECT = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function SettingImageUploadDialog({
  open,
  onOpenChange,
  onUpload,
  currentImageUrl: _currentImageUrl,
}: SettingImageUploadDialogProps) {
  const t = useTranslations('settings.profile.upload');
  const tCommon = useTranslations('common');
  const uploadFailureMessage = useDirectUploadMessage();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The dropped file's type, not its name. The output format is decided from it, and
  // the filename sent to the API is derived from that decision — the user's own
  // filename never reaches the storage path, which the server derives itself.
  const [sourceContentType, setSourceContentType] = useState<string>('image/jpeg');

  // Closing the dialog mid-transfer has to stop the transfer. Without this, a user who
  // pressed Escape would still overwrite their picture some seconds later.
  const transferRef = useRef<AbortController | null>(null);

  useEffect(() => () => transferRef.current?.abort(), []);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t('errors.invalidType'));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(t('errors.fileTooLarge', { maxSize: MAX_FILE_SIZE / 1024 / 1024 }));
        return;
      }

      setSourceContentType(file.type);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
      });
      reader.addEventListener('error', () => {
        setError(t('errors.readFailed'));
      });
      reader.readAsDataURL(file);
    },
    [t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleCancel = () => {
    transferRef.current?.abort();
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setSourceContentType('image/jpeg');
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    setError(null);

    const transfer = new AbortController();
    transferRef.current = transfer;

    try {
      // One format decision, used for the bytes the canvas encodes, the content type the
      // URL is minted for, and the extension the server derives the path from. Deciding
      // any of the three separately is how they come to disagree.
      const format = chooseOutputFormat(sourceContentType);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, format.contentType);
      const resizedImage = await resizeImage(croppedImage, 600, 600, 0.85, format.contentType);

      await onUpload(
        {
          body: resizedImage,
          filename: `profile.${format.extension}`,
          contentType: format.contentType,
        },
        { signal: transfer.signal }
      );

      handleCancel();
    } catch (err) {
      // A cancelled transfer is the dialog closing, not a problem to report back into a
      // dialog that is on its way out.
      if (!(err instanceof DirectUploadError && err.failure === 'aborted')) {
        setError(uploadFailureMessage(err));
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!imageSrc ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                hover:border-primary hover:bg-primary/5
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">
                {isDragActive ? t('dropzone.active') : t('dropzone.idle')}
              </p>
              <p className="text-xs text-muted-foreground mb-4">{t('dropzone.hint')}</p>
              <Button type="button" variant="outline" size="sm">
                {t('dropzone.browse')}
              </Button>
              {error && <p className="text-sm text-destructive mt-4">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-[400px] bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={CROP_AREA_ASPECT}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('zoom')}</label>
                <input
                  type="range"
                  value={zoom}
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isUploading}>
            {tCommon('actions.cancel')}
          </Button>
          {imageSrc && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImageSrc(null);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                  setError(null);
                  setSourceContentType('image/jpeg');
                }}
                disabled={isUploading}
              >
                {t('changeImage')}
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !croppedAreaPixels}
              >
                {isUploading ? tCommon('actions.uploading') : t('upload')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
