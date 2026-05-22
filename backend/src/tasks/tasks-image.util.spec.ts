import {
  toResizedKey,
  isValidImageKey,
  isAllowedImageContentType,
  assertFileNameMatchesContentType,
} from './tasks-image.util';

describe('tasks-image.util', () => {
  it('maps originals key to resized key', () => {
    expect(toResizedKey('originals/abc-photo.png')).toBe(
      'resized/abc-photo.png',
    );
  });

  it('validates image keys', () => {
    expect(isValidImageKey('originals/uuid-file.jpg')).toBe(true);
    expect(isValidImageKey('resized/uuid-file.jpg')).toBe(false);
    expect(isValidImageKey('originals/')).toBe(false);
  });

  it('allows supported content types', () => {
    expect(isAllowedImageContentType('image/png')).toBe(true);
    expect(isAllowedImageContentType('application/pdf')).toBe(false);
  });

  it('matches extension to content type', () => {
    expect(() =>
      assertFileNameMatchesContentType('a.png', 'image/jpeg'),
    ).toThrow();
    expect(() =>
      assertFileNameMatchesContentType('a.png', 'image/png'),
    ).not.toThrow();
  });
});
