#!/usr/bin/env node
/**
 * build-cms-index.js — index des thèmes et des œuvres pour le CMS
 * ------------------------------------------------------------------------
 * `keystatic.config.ts` est chargé par Vite ET par l'API d'administration
 * Keystatic. Importer les ~80 fichiers YAML du catalogue depuis cette
 * configuration y est trop lent : la page d'administration finit par ne plus
 * répondre. Ce script produit donc un index unique, mis à jour à chaque
 * `predev` / `prebuild`, que la configuration se contente de lire.
 *
 * L'index alimente :
 *   - les collections « Œuvres — <thème> » générées pour chaque thème ;
 *   - la navigation de l'administration ;
 *   - les listes déroulantes du carrousel et de la sélection d'accueil.
 *
 * L'index n'est que Source de vérité pour le CMS : le contenu reste dans les
 * YAML, seul un résumé (slug, thème, titre) est recopié.
 *
 * Usage :
 *   node scripts/build-cms-index.js          (lancé par predev / prebuild)
 *   node scripts/build-cms-index.js --check  (échoue si l'index est périmé)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = path.join(ROOT, 'src', 'content', 'themes');
const WORKS_DIR = path.join(ROOT, 'src', 'content', 'works');
const OUT = path.join(ROOT, 'src', 'data', 'cms-index.json');
const CHECK = process.argv.includes('--check');

/** Fichiers YAML d'un dossier (sans récursion). */
function yamlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'));
}

/** Valeur d'un champ de première niveau, sans moteur YAML complet. */
function field(raw, name) {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, 'm'));
  if (!match) return null;
  const value = match[1].replace(/^["']|["']$/g, '').trim();
  return value.length > 0 ? value : null;
}

try {
  /* Thèmes : nom du fichier = slug, `title` = nom affiché. */
  const themes = yamlFiles(THEMES_DIR)
    .map((file) => {
      const raw = readFileSync(path.join(THEMES_DIR, file), 'utf8');
      const slug = file.replace(/\.ya?ml$/, '');
      const order = Number(field(raw, 'order'));
      return {
        slug,
        title: field(raw, 'title') ?? slug,
        order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'fr'));

  /* Œuvres : dossier = thème, nom du fichier = slug. */
  const works = [];
  for (const theme of themes) {
    const dir = path.join(WORKS_DIR, theme.slug);
    for (const file of yamlFiles(dir)) {
      const raw = readFileSync(path.join(dir, file), 'utf8');
      const slug = file.replace(/\.ya?ml$/, '');
      works.push({
        value: `${theme.slug}/${slug}`,
        title: field(raw, 'title') ?? slug,
        theme: theme.slug,
      });
    }
  }

  const payload = `${JSON.stringify({ themes, works }, null, 2)}\n`;

  if (CHECK) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== payload) {
      console.error('Index CMS périmé : lancez `node scripts/build-cms-index.js`.');
      process.exit(1);
    }
    console.log('Index CMS à jour.');
  } else {
    writeFileSync(OUT, payload);
    console.log(`Index CMS : ${themes.length} thème(s), ${works.length} œuvre(s).`);
  }
} catch (error) {
  console.error('Index CMS non généré :', error.message);
  process.exit(1);
}