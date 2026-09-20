import { describe, expect, it } from 'vitest';

import { getCroppedImg, resizeImage } from './image-processing';

async function loadFixturePng(): Promise<Blob> {
  const response = await fetch(new URL('./fixtures/opaque-crop-source.png', import.meta.url));
  if (!response.ok) {
    throw new Error(`Failed to load crop fixture: ${response.status}`);
  }
  return response.blob();
}

async function samplePixels(blob: Blob): Promise<Uint8ClampedArray> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    URL.revokeObjectURL(url);
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

describe('the shared picture crop pipeline', () => {
  it('keeps non-zero color and alpha from a fixture PNG', async () => {
    const source = await loadFixturePng();
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
  });
});
