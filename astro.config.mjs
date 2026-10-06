// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

// SSG : pages publiques en HTML pur. /keystatic et son API restent rendus
// à la demande (adapter Node). Variante 100 % statique : npm run build:static
const withoutAdmin = process.env.KEYSTATIC_DISABLED === '1';
// Netlify → Functions dédiées ; ailleurs → serveur Node standalone.
const onNetlify = process.env.NETLIFY === 'true';
const adapter = onNetlify ? netlify() : node({ mode: 'standalone' });

// https://astro.build/config
export default defineConfig({
  site: 'https://www.yannjaime.com',
  // FR à la racine, EN sous /en/ (les URL françaises ne changent pas).
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  output: 'static',
  ...(withoutAdmin ? {} : { adapter }),
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    ...(withoutAdmin ? [] : [keystatic()]),
    // Requis par l'îlot React de Keystatic (les îlots Vue restent inchangés).
    react(),
    vue(),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.mjs',
    }),
    sitemap(),
  ],
});
