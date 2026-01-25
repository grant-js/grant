'use client';

import { useCallback, useState } from 'react';

import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import {
  getContentTypeFromExtension,
  getCroppedImg,
  getFileExtension,
  resizeImage,
} from '@/lib/utils/image-processing';

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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>('profile.jpg');

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

      setOriginalFilename(file.name);
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
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setOriginalFilename('profile.jpg');
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    setError(null);

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const resizedImage = await resizeImage(croppedImage, 600, 600, 0.85);

      const extension = getFileExtension(originalFilename);
      const contentType = getContentTypeFromExtension(extension);

      await onUpload(resizedImage, `profile.${extension}`, contentType);

      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.uploadFailed'));
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
                  setOriginalFilename('profile.jpg');
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
