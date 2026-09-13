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

/** Runs `fn` against a URL for `source`, revoking it afterwards either way. */
async function withSourceUrl<T>(
  source: string | Blob,
  fn: (url: string) => Promise<T>
): Promise<T> {
  if (typeof source === 'string') {
    return fn(source);
  }
  const url = URL.createObjectURL(source);
  try {
    return await fn(url);
  } finally {
    URL.revokeObjectURL(url);
  }
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
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
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
  const image = await withSourceUrl(imageSrc, createImage);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = getRadianAngle(rotation);

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(data, 0, 0);

  return canvasToBlob(canvas, contentType);
}

export async function resizeImage(
  imageSrc: string | Blob,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9,
  contentType: string = DEFAULT_OUTPUT_FORMAT.contentType
): Promise<Blob> {
  const image = await withSourceUrl(imageSrc, createImage);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  let { width, height } = image;

  if (width > height) {
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, contentType, quality);
}
