// scripts/lib/parse-elementor.js
// Pure functions for parsing Elementor JSON data.
// All functions are side-effect free — no file I/O.

/**
 * Walk all elements recursively. Calls visitor(element) for each.
 */
function walk(elements, visitor) {
  for (const el of elements) {
    visitor(el);
    if (el.elements?.length) walk(el.elements, visitor);
  }
}

/**
 * Return deduplicated list of widget types used across all elements.
 * @param {object[]} elementorData - parsed _elementor_data array
 */
export function extractWidgetTypes(elementorData) {
  const types = new Set();
  walk(elementorData, (el) => {
    if (el.elType === 'widget' && el.widgetType) types.add(el.widgetType);
  });
  return [...types];
}

/**
 * Return all background_image URLs from section/column/widget settings.
 */
export function extractBackgroundImages(elementorData) {
  const urls = [];
  walk(elementorData, (el) => {
    const bg = el.settings?.background_image?.url;
    if (bg) urls.push(bg);
  });
  return [...new Set(urls)];
}

/**
 * Return form definitions: [{ widgetId, fields: [{ type, label, required, placeholder }] }]
 */
export function extractForms(elementorData) {
  const forms = [];
  walk(elementorData, (el) => {
    if (el.elType === 'widget' && el.widgetType === 'form') {
      const fields = (el.settings?.form_fields ?? []).map((f) => ({
        type: f.field_type,
        label: f.field_label,
        required: f.required === 'yes',
        placeholder: f.placeholder ?? '',
      }));
      forms.push({ widgetId: el.id, fields });
    }
  });
  return forms;
}

/**
 * Infer spacing scale from all padding/margin values across pages.
 * Returns pixel values sorted by frequency (most common first).
 * @param {object[][]} allPagesData - array of elementorData arrays (one per page)
 */
export function inferSpacingScale(allPagesData) {
  const freq = {};
  for (const pageData of allPagesData) {
    walk(pageData, (el) => {
      for (const key of ['padding', 'margin', '_padding', '_margin']) {
        const val = el.settings?.[key];
        if (!val) continue;
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const px = parseInt(val[side], 10);
          if (!isNaN(px) && px > 0) freq[px] = (freq[px] ?? 0) + 1;
        }
      }
    });
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([px]) => Number(px));
}

/**
 * Extract global color palette from Elementor Kit settings.
 * Returns { colorId: hexValue }
 */
export function extractKitColors(kitSettings) {
  const colors = {};
  for (const c of kitSettings.system_colors ?? []) {
    colors[c.id] = c.color;
  }
  return colors;
}

/**
 * Extract font families from Elementor Kit typography settings.
 * Returns string[]
 */
export function extractKitFonts(kitSettings) {
  return (kitSettings.system_typography ?? [])
    .map((t) => t.typography_font_family)
    .filter(Boolean);
}
