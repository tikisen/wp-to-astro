// tests/lib/qa-manifest.test.js
import { describe, it, expect } from 'vitest';
import { buildSlug, buildManifest } from '../../scripts/lib/qa-manifest.js';

describe('buildSlug', () => {
  it('converts root path to index', () => {
    expect(buildSlug('/')).toBe('index');
  });

  it('converts /about/ to about_', () => {
    expect(buildSlug('/about/')).toBe('about_');
  });

  it('converts /services/web/ to services_web_', () => {
    expect(buildSlug('/services/web/')).toBe('services_web_');
  });

  it('handles path without trailing slash', () => {
    expect(buildSlug('/contact')).toBe('contact');
  });
});

describe('buildManifest', () => {
  const sitemap = [
    { url: 'https://example.com/' },
    { url: 'https://example.com/about/' },
  ];

  it('builds correct manifest entries', () => {
    const manifest = buildManifest(sitemap, 'http://localhost:4321');
    expect(manifest).toHaveLength(2);
    expect(manifest[0]).toEqual({
      slug: 'index',
      wpUrl: 'https://example.com/',
      astroUrl: 'http://localhost:4321/',
      original: 'extraction/screenshots/index.png',
      generated: 'qa/screenshots/index.png',
    });
    expect(manifest[1]).toEqual({
      slug: 'about_',
      wpUrl: 'https://example.com/about/',
      astroUrl: 'http://localhost:4321/about/',
      original: 'extraction/screenshots/about_.png',
      generated: 'qa/screenshots/about_.png',
    });
  });

  it('strips trailing slash from astroBaseUrl', () => {
    const manifest = buildManifest(
      [{ url: 'https://example.com/about/' }],
      'http://localhost:4321/'
    );
    expect(manifest[0].astroUrl).toBe('http://localhost:4321/about/');
  });
});
