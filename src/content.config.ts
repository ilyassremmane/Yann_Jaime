import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Les contenus éditoriaux sont gérés par Keystatic (`keystatic.config.ts`)
 * et lus via le Reader (`src/lib/content.ts`).
 *
 * Ces collections sont déclarées ici uniquement pour que les dossiers de
 * `src/content/` soient reconnus explicitement (sinon Astro les auto-génère,
 * ce qui est déprécié et produit des avertissements au démarrage).
 * Chaque fichier `.yaml` correspond à une œuvre ou à une page unique.
 */
export const collections = {
  works: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/works' }) }),
  expositions: defineCollection({
    loader: glob({ pattern: '*.yaml', base: './src/content/expositions' }),
  }),
  themes: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/themes' }) }),
  homepage: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/homepage' }) }),
  about: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/about' }) }),
  settings: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/settings' }) }),
};