import { describe, expect, it } from 'vitest';

import { chooseOutputFormat, clampCropArea } from './image-processing';

describe('the format the crop pipeline emits', () => {
  it('keeps the format it was given, when a canvas can encode it', () => {
    expect(chooseOutputFormat('image/png')).toEqual({
      contentType: 'image/png',
      extension: 'png',
    });
    expect(chooseOutputFormat('image/webp')).toEqual({
      contentType: 'image/webp',
      extension: 'webp',
    });
  });

  it('names the content type and the extension from one decision', () => {
    // These were decided in two places before this slice: the bytes were always JPEG
    // and the content type came from the dropped file's extension, so a `.png` was
    // uploaded as JPEG bytes labelled `image/png`. The presigned URL signs the content
    // type it was minted for, so the disagreement stopped being cosmetic.
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      const format = chooseOutputFormat(contentType);
      expect(chooseOutputFormat(format.contentType)).toEqual(format);
    }
  });

  it('re-labels GIF as PNG, because a canvas has no GIF encoder', () => {
    // `toBlob('image/gif')` substitutes PNG silently. Saying so is the difference
    // between a truthful content type and a lie the store will sign.
    expect(chooseOutputFormat('image/gif')).toEqual({
      contentType: 'image/png',
      extension: 'png',
    });
  });

  it('falls back to JPEG for anything else, rather than trusting an unknown label', () => {
    expect(chooseOutputFormat('image/tiff')).toEqual({
      contentType: 'image/jpeg',
      extension: 'jpg',
    });
    expect(chooseOutputFormat('')).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('is case-insensitive, since a content type from a file picker need not be lowercase', () => {
    expect(chooseOutputFormat('IMAGE/PNG')).toEqual({
      contentType: 'image/png',
      extension: 'png',
    });
  });
});

describe('the crop rectangle the dialog hands the helper', () => {
  it('keeps an in-bounds crop on the source bitmap', () => {
    expect(clampCropArea({ x: 0, y: 0, width: 8, height: 8 }, 16, 16)).toEqual({
      x: 0,
      y: 0,
      width: 8,
      height: 8,
    });
  });

  it('clamps an out-of-bounds crop instead of leaving a rectangle with no source pixels', () => {
    expect(clampCropArea({ x: 64, y: 64, width: 240, height: 240 }, 16, 16)).toEqual({
      x: 15,
      y: 15,
      width: 1,
      height: 1,
    });
  });

  it('never returns a zero-sized crop, which would encode a transparent PNG', () => {
    expect(clampCropArea({ x: 0, y: 0, width: 0, height: 0 }, 16, 16)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it('clips a crop that hangs off the edge of a 16×16 fixture', () => {
    expect(clampCropArea({ x: 12, y: 12, width: 16, height: 16 }, 16, 16)).toEqual({
      x: 12,
      y: 12,
      width: 4,
      height: 4,
    });
  });
});
