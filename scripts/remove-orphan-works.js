#!/usr/bin/env node
/**
 * remove-orphan-works.js — suppression en cascade des œuvres d'un thème retiré
 * ------------------------------------------------------------------------
 * Le thème est la clé de rangement des œuvres (`src/content/works/<thème>/`).
 * Quand l'artiste supprime un thème dans Keystatic, sa collection « Œuvres »
 * disparaît de l'administration, mais ses fiches et ses images resteraient
 * orphelines sur le disque : ce script les efface.
 *
 * Lancé automatiquement à chaque `predev` et `prebuild` (et à la demande via
 * `npm run content:cleanup`) :
 *   - `src/content/works/<thème>/`       les fiches YAML ;
 *   - `public/images/works/<thème>/`     les photos ;
 *   - `public/images/works/thumbs/<thème>/` les vignettes ;
 *   - `public/images/themes/<thème>/`    la couverture, si portée par ce nom ;
 *   - les entrées correspondantes de `src/data/images-manifest.json`.
 *
 * Un dossier n'est touché que si AUCUN fichier `src/content/themes/<dossier>.yaml`
 * n'existe : les thèmes vivants ne sont jamais modifiés. Tout est récupérable
 * dans l'historique Git en cas de suppression accidentelle.
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = path.join(ROOT, 'src', 'content', 'themes');
const WORKS_DIR = path.join(ROOT, 'src', 'content', 'works');
const IMAGES_DIR = path.join(ROOT, 'public', 'images', 'works');
const THUMBS_DIR = path.join(IMAGES_DIR, 'thumbs');
const THEME_IMAGES_DIR = path.join(ROOT, 'public', 'images', 'themes');
const MANIFEST = path.join(ROOT, 'src', 'data', 'images-manifest.json');

/** Noms de thèmes encore présents dans le CMS. */
function livingThemes() {
  if (!existsSync(THEMES_DIR)) return new Set();
  return new Set(
    readdirSync(THEMES_DIR)
      .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
      .map((name) => name.replace(/\.ya?ml$/, ''))
  );
}

/** Dossiers d'œuvres sur le disque (uniquement les dossiers). */
function workFolders() {
  if (!existsSync(WORKS_DIR)) return [];
  return readdirSync(WORKS_DIR).filter(
    (name) => existsSync(path.join(WORKS_DIR, name)) && statSync(path.join(WORKS_DIR, name)).isDirectory()
  );
}

function remove(target, reason) {
  if (!existsSync(target)) return;
  rmSync(target, { recursive: true, force: true });
  console.log(`  • supprimé : ${path.relative(ROOT, target)} (${reason})`);
}

try {
  const alive = livingThemes();
  const orphans = workFolders().filter((folder) => !alive.has(folder));

  if (orphans.length === 0) {
    console.log('Nettoyage des œuvres orphelines : rien à faire.');
    process.exit(0);
  }

  console.log('Thème(s) supprimé(s) — nettoyage des œuvres associées :');
  for (const folder of orphans) {
    remove(path.join(WORKS_DIR, folder), 'fiches du thème');
    remove(path.join(IMAGES_DIR, folder), 'photos');
    remove(path.join(THUMBS_DIR, folder), 'vignettes');
    remove(path.join(THEME_IMAGES_DIR, folder), 'couverture');
  }

  /* Manifeste des dimensions : retirer les fichiers des dossiers supprimés. */
  if (existsSync(MANIFEST)) {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const kept = manifest.filter((entry) => {
      const file = typeof entry?.file === 'string' ? entry.file : '';
      return !orphans.some((folder) => file.includes(`/works/${folder}/`));
    });
    if (kept.length !== manifest.length) {
      writeFileSync(MANIFEST, `${JSON.stringify(kept, null, 2)}\n`);
      console.log(`  • manifeste : ${manifest.length - kept.length} entrée(s) retirée(s)`);
    }
  }

  console.log('Nettoyage terminé.');
} catch (error) {
  /* Le nettoyage ne doit jamais empêcher le démarrage ni le build. */
  console.warn('Nettoyage des œuvres orphelines ignoré :', error.message);
}
