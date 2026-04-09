// tests/lib/asset-finder.test.js
import { describe, it, expect } from 'vitest';
import { collectAssetUrls, categorizeAsset, resolveUrl } from '../../scripts/lib/asset-finder.js';

describe('collectAssetUrls', () => {
  it('unions all sources and deduplicates', () => {
    const urls = collectAssetUrls({
      elementorBackgrounds: ['https://example.com/bg.jpg'],
      cssUrls: ['https://example.com/bg.jpg', 'https://example.com/logo.png'],
      computedBackgrounds: [],
      htmlSrcs: ['https://example.com/photo.jpg'],
      mediaUrls: [],
    });
    expect(urls).toHaveLength(3);
    expect(urls).toContain('https://example.com/bg.jpg');
  });

  it('excludes data: URLs', () => {
    const urls = collectAssetUrls({
      elementorBackgrounds: [],
      cssUrls: ['data:image/png;base64,abc'],
      computedBackgrounds: [],
      htmlSrcs: [],
      mediaUrls: [],
    });
    expect(urls).toHaveLength(0);
  });
});

describe('categorizeAsset', () => {
  it('identifies favicon files', () => {
    expect(categorizeAsset('https://example.com/favicon.ico')).toBe('favicon');
    expect(categorizeAsset('https://example.com/apple-touch-icon.png')).toBe('favicon');
  });

  it('identifies font files', () => {
    expect(categorizeAsset('https://example.com/fonts/inter.woff2')).toBe('font');
  });

  it('defaults to image for everything else', () => {
    expect(categorizeAsset('https://example.com/uploads/photo.jpg')).toBe('image');
  });
});

describe('resolveUrl', () => {
  it('resolves relative URLs against base', () => {
    expect(resolveUrl('/uploads/photo.jpg', 'https://example.com')).toBe('https://example.com/uploads/photo.jpg');
  });

  it('passes through absolute URLs unchanged', () => {
    expect(resolveUrl('https://other.com/img.jpg', 'https://example.com')).toBe('https://other.com/img.jpg');
  });
});
