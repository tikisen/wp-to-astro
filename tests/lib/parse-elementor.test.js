// tests/lib/parse-elementor.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  extractWidgetTypes,
  extractBackgroundImages,
  extractForms,
  inferSpacingScale,
  extractKitColors,
  extractKitFonts,
} from '../../scripts/lib/parse-elementor.js';

const pageData = JSON.parse(readFileSync('tests/fixtures/elementor-page.json', 'utf8'));
const kitData = JSON.parse(readFileSync('tests/fixtures/elementor-kit.json', 'utf8'));

describe('extractWidgetTypes', () => {
  it('returns all widget types used in a page', () => {
    const types = extractWidgetTypes(pageData);
    expect(types).toContain('heading');
    expect(types).toContain('image');
    expect(types).toContain('form');
  });

  it('deduplicates widget types', () => {
    const types = extractWidgetTypes(pageData);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('extractBackgroundImages', () => {
  it('finds background images in section settings', () => {
    const urls = extractBackgroundImages(pageData);
    expect(urls).toContain('https://example.com/uploads/hero-bg.jpg');
  });
});

describe('extractForms', () => {
  it('returns form field definitions', () => {
    const forms = extractForms(pageData);
    expect(forms).toHaveLength(1);
    expect(forms[0].fields).toHaveLength(2);
    expect(forms[0].fields[0]).toMatchObject({ type: 'text', label: 'Name', required: true });
    expect(forms[0].fields[1]).toMatchObject({ type: 'email', label: 'Email', required: true });
  });
});

describe('inferSpacingScale', () => {
  it('returns pixel values sorted by frequency', () => {
    const scale = inferSpacingScale([pageData]);
    expect(scale).toContain(80);
    expect(Array.isArray(scale)).toBe(true);
  });
});

describe('extractKitColors', () => {
  it('returns color map from kit system_colors', () => {
    const colors = extractKitColors(kitData);
    expect(colors.primary).toBe('#1B4FD8');
    expect(colors.secondary).toBe('#0F172A');
  });
});

describe('extractKitFonts', () => {
  it('returns font families from kit system_typography', () => {
    const fonts = extractKitFonts(kitData);
    expect(fonts).toContain('Inter');
    expect(fonts).toContain('Georgia');
  });
});
