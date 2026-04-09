import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// SITE_URL is replaced by the migration tool for each site
export default defineConfig({
  site: 'https://SITE_URL_PLACEHOLDER',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
