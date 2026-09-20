export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * What the crop/resize pipeline can actually emit, and what to call the result.
 *
 * A canvas encodes what `toBlob` is asked for and silently substitutes PNG for
 * anything it cannot — so the format is chosen here, once, and the extension is
 * derived from the same decision. The two used to be decided separately: the bytes
 * were always JPEG and the content type came from the dropped file's extension, so a
 * dropped `.png` was uploaded as JPEG bytes labelled `image/png`. A presigned URL
 * commits to the content type it was minted for (ADR 0007), which turns that
 * mislabelling from cosmetic into signed.
 */
export interface ProcessedImageFormat {
  contentType: string;
  extension: string;
}

const OUTPUT_FORMATS: Record<string, ProcessedImageFormat> = {
  'image/jpeg': { contentType: 'image/jpeg', extension: 'jpg' },
  'image/png': { contentType: 'image/png', extension: 'png' },
  'image/webp': { contentType: 'image/webp', extension: 'webp' },
  // Canvas has no GIF encoder. The crop already reduced an animation to one frame, so
  // PNG is what the bytes are either way — say so rather than letting `toBlob` decide
  // quietly and label it `image/gif`.
  'image/gif': { contentType: 'image/png', extension: 'png' },
};

const DEFAULT_OUTPUT_FORMAT: ProcessedImageFormat = OUTPUT_FORMATS['image/jpeg'];

export function chooseOutputFormat(inputContentType: string): ProcessedImageFormat {
  return OUTPUT_FORMATS[inputContentType.toLowerCase()] ?? DEFAULT_OUTPUT_FORMAT;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  contentType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      contentType,
      quality
    );
  });
}

async function createImage(url: string): Promise<HTMLImageElement> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.addEventListener('load', () => resolve(element));
    element.addEventListener('error', (error) => reject(error));
    element.src = url;
  });

  if (typeof image.decode === 'function') {
    await image.decode();
  }

  return image;
}

async function sourceToBitmap(source: string | Blob): Promise<ImageBitmap> {
  if (typeof source !== 'string') {
    return createImageBitmap(source);
  }

  if (source.startsWith('blob:') || source.startsWith('data:')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error('Failed to read image source');
    }
    return createImageBitmap(await response.blob());
  }

  const image = await createImage(source);
  return createImageBitmap(image);
}

export function clampCropArea(crop: CropArea, width: number, height: number): CropArea {
  const x = Math.min(Math.max(0, Math.round(crop.x)), Math.max(0, width - 1));
  const y = Math.min(Math.max(0, Math.round(crop.y)), Math.max(0, height - 1));
  return {
    x,
    y,
    width: Math.min(Math.max(1, Math.round(crop.width)), width - x),
    height: Math.min(Math.max(1, Math.round(crop.height)), height - y),
  };
}

function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number): ImageDimensions {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function bitmapToBlob(
  bitmap: ImageBitmap,
  contentType: string,
  quality?: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  ctx.drawImage(bitmap, 0, 0);
  return canvasToBlob(canvas, contentType, quality);
}

/**
 * Returns the cropped bytes, not a data URL. The upload sends a body, and every
 * base64 round trip between the canvas and the wire costs a third of the transfer
 * for nothing.
 */
export async function getCroppedImg(
  imageSrc: string | Blob,
  pixelCrop: CropArea,
  contentType: string = DEFAULT_OUTPUT_FORMAT.contentType,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob> {
  const bitmap = await sourceToBitmap(imageSrc);

  try {
    if (bitmap.width < 1 || bitmap.height < 1) {
      throw new Error('Image has no pixels');
    }

    const needsTransform = rotation !== 0 || flip.horizontal || flip.vertical;
    const source = needsTransform ? await transformBitmap(bitmap, rotation, flip) : bitmap;

    try {
      const crop = clampCropArea(pixelCrop, source.width, source.height);
      const cropped = await createImageBitmap(source, crop.x, crop.y, crop.width, crop.height);
      try {
        return await bitmapToBlob(cropped, contentType);
      } finally {
        cropped.close();
      }
    } finally {
      if (source !== bitmap) {
        source.close();
      }
    }
  } finally {
    bitmap.close();
  }
}

async function transformBitmap(
  bitmap: ImageBitmap,
  rotation: number,
  flip: { horizontal: boolean; vertical: boolean }
): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    bitmap.width,
    bitmap.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-bitmap.width / 2, -bitmap.height / 2);
  ctx.drawImage(bitmap, 0, 0);
  return createImageBitmap(canvas);
}

export async function resizeImage(
  imageSrc: string | Blob,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9,
  contentType: string = DEFAULT_OUTPUT_FORMAT.contentType
): Promise<Blob> {
  const bitmap = await sourceToBitmap(imageSrc);

  try {
    let { width, height } = bitmap;

    if (width > height) {
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
    } else if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvasToBlob(canvas, contentType, quality);
  } finally {
    bitmap.close();
  }
}
