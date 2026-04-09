// tests/lib/parse-css.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  extractCustomProperties,
  extractUrls,
  extractFontFaces,
  extractGoogleFontsUrls,
} from '../../scripts/lib/parse-css.js';

const css = readFileSync('tests/fixtures/sample-styles.css', 'utf8');

describe('extractCustomProperties', () => {
  it('returns all :root custom properties', () => {
    const props = extractCustomProperties(css);
    expect(props['--color-primary']).toBe('#1B4FD8');
    expect(props['--font-sans']).toBe("'Inter', sans-serif");
    expect(props['--spacing-lg']).toBe('48px');
  });
});

describe('extractUrls', () => {
  it('finds all url(...) values and strips quotes', () => {
    const urls = extractUrls(css);
    expect(urls).toContain('https://example.com/uploads/hero-bg.jpg');
    expect(urls).toContain('/uploads/logo.svg');
    expect(urls).toContain('https://example.com/fonts/custom.woff2');
  });
});

describe('extractFontFaces', () => {
  it('returns font-face declarations with family and src', () => {
    const faces = extractFontFaces(css);
    expect(faces).toHaveLength(1);
    expect(faces[0].family).toBe('CustomFont');
    expect(faces[0].src).toContain('custom.woff2');
  });
});

describe('extractGoogleFontsUrls', () => {
  it('extracts Google Fonts link hrefs from HTML', () => {
    const html = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">`;
    const urls = extractGoogleFontsUrls(html);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('fonts.googleapis.com');
  });

  it('returns empty array when no Google Fonts links present', () => {
    expect(extractGoogleFontsUrls('<html><head></head></html>')).toEqual([]);
  });
});
