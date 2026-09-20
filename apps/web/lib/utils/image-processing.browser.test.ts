import { describe, expect, it } from 'vitest';

import { getCroppedImg, resizeImage } from './image-processing';

const TAILWIND_IMG_PREFLIGHT = `
  img, svg, video, canvas, audio, iframe, embed, object {
    vertical-align: middle;
    display: block;
  }
  img, video {
    max-width: 100%;
    height: auto;
  }
`;

function applyTailwindImgPreflight() {
  const style = document.createElement('style');
  style.textContent = TAILWIND_IMG_PREFLIGHT;
  document.head.append(style);
}

async function loadFixturePng(): Promise<Blob> {
  const response = await fetch(new URL('./fixtures/opaque-crop-source.png', import.meta.url));
  if (!response.ok) {
    throw new Error(`Failed to load crop fixture: ${response.status}`);
  }
  return response.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function samplePixels(blob: Blob): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    bitmap.close();
  }
}

function channelExtrema(pixels: Uint8ClampedArray, offset: number): { min: number; max: number } {
  let min = 255;
  let max = 0;
  for (let index = offset; index < pixels.length; index += 4) {
    const value = pixels[index] ?? 0;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

async function expectOpaqueCrop(source: string | Blob) {
  const cropped = await getCroppedImg(source, { x: 0, y: 0, width: 8, height: 8 }, 'image/png');
  const resized = await resizeImage(cropped, 600, 600, 0.85, 'image/png');

  expect(resized.type).toBe('image/png');

  const pixels = await samplePixels(resized);
  const red = channelExtrema(pixels, 0);
  const alpha = channelExtrema(pixels, 3);

  expect(red.max).toBeGreaterThan(0);
  expect(alpha.max).toBeGreaterThan(0);
  expect(pixels[0]).toBeGreaterThan(200);
  expect(pixels[3]).toBeGreaterThan(200);
}

describe('the shared picture crop pipeline', () => {
  it('keeps non-zero color and alpha from a fixture PNG', async () => {
    applyTailwindImgPreflight();
    await expectOpaqueCrop(await loadFixturePng());
  });

  it('keeps pixels when the dialog passes a FileReader data URL', async () => {
    applyTailwindImgPreflight();
    const source = await loadFixturePng();
    await expectOpaqueCrop(await blobToDataUrl(source));
  });

  it('clamps an out-of-bounds crop instead of encoding a transparent PNG', async () => {
    applyTailwindImgPreflight();
    const source = await loadFixturePng();
    const cropped = await getCroppedImg(
      source,
      { x: 64, y: 64, width: 240, height: 240 },
      'image/png'
    );
    const pixels = await samplePixels(cropped);
    const red = channelExtrema(pixels, 0).max;
    const blue = channelExtrema(pixels, 2).max;
    expect(Math.max(red, blue)).toBeGreaterThan(0);
    expect(channelExtrema(pixels, 3).max).toBeGreaterThan(0);
  });
});
