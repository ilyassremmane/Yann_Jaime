// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

/**
 * Le site public est généré en statique (SSG) : toutes les pages /oeuvres,
 * /a-propos, /contact sont du HTML pur au build.
 *
 * L'interface d'administration Keystatic (/keystatic) et son API ont besoin
 * d'être rendues à la demande : un adapter Node est donc déclaré.
 * Pour un hébergement 100 % statique (sans interface d'administration) :
 *   npm run build:static
 */
const withoutAdmin = process.env.KEYSTATIC_DISABLED === '1';
/*
 * Choix de l'adapter selon la plateforme :
 *  - Netlify (env NETLIFY=true) : @astrojs/netlify expose les routes à la
 *    demande (/keystatic, /api/keystatic) en Netlify Functions.
 *  - Ailleurs : serveur Node standalone (`node dist/server/entry.mjs`).
 */
const onNetlify = process.env.NETLIFY === 'true';
const adapter = onNetlify ? netlify() : node({ mode: 'standalone' });

// https://astro.build/config
export default defineConfig({
  // URL publique de production (doit matcher BaseLayout.SITE)
  site: 'https://www.yannjaime.com',
  /*
   * Bilinguisme du site :
   *  - français : à la racine (`/`, `/oeuvres`, …) — langue par défaut ;
   *  - anglais  : sous le préfixe `/en/…`.
   * Les URL françaises ne changent donc pas (bon pour le référencement).
   */
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
    // CMS : interface d'administration sur /keystatic
    ...(withoutAdmin ? [] : [keystatic()]),
    /*
     * L'interface de Keystatic est une application React (îlot `client:only="react"`).
     * Sans cette intégration, Astro ne trouve pas de renderer React et l'îlot ne
     * s'hydrate pas (page blanche) — les îlots Vue du site restent inchangés.
     */
    react(),
    vue(),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.mjs',
    }),
    sitemap(),
  ],
});
