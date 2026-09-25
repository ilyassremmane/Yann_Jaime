#!/usr/bin/env node
/**
 * migrate-keystatic-image-paths.mjs
 * ------------------------------------------------------------------
 * Migration en deux parties (idempotent) :
 *
 * 1. CHEMINS D'IMAGES → layout canonique Keystatic.
 *    Keystatic résout les champs `image` d'une collection avec la formule
 *    `publicPath + slug de l'entrée + '/' + fichier`. Les fichiers devaient
 *    donc vivre dans `public/images/works/<slug>/` (et non `<thème>/`), sinon
 *    l'admin n'affichait aucun aperçu et bloquait la sauvegarde avec
 *    « Image principale is required ». On COPIE les fichiers vers le dossier
 *    du slug d'entrée (les originaux restent en place : anciens URLs,
 *    couvertures de secours, vignettes historiques).
 *
 * 2. VISIBILITÉ : remplace l'ancien booléen `available` (jamais affiché sur
 *    le site) par `visible: true` (« Afficher sur le site ») dans les Œuvres
 *    et les Thèmes.
 *
 * Usage : node scripts/migrate-keystatic-image-paths.mjs
 */

import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = (...args) => console.log('•', ...args);
const warn = (...args) => console.warn('⚠ ', ...args);

/** Copie src → dst (crée le dossier) si la source existe. */
function copy(src, dst) {
  if (!existsSync(src)) return false;
  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

/** Ajoute `visible: true` en fin de YAML (si absent) et retire `available:`. */
function applyVisibility(text) {
  let out = text.replace(/^available:.*\n/m, '');
  if (!/^visible:/m.test(out)) {
    out = out.replace(/\s*$/, '') + '\nvisible: true\n';
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1a. ŒUVRES : /images/works/<dossier>/<fichier> → <slug>/<fichier>   */
/* ------------------------------------------------------------------ */
const worksDir = path.join(ROOT, 'src', 'content', 'works');
for (const file of readdirSync(worksDir).filter((f) => f.endsWith('.yaml')).sort()) {
  const slug = file.replace(/\.yaml$/, '');
  const filePath = path.join(worksDir, file);
  const before = readFileSync(filePath, 'utf8');
  let after = before.replace(
    /\/images\/works\/([^/\s"']+)\/([^/\s"']+)(?=["'])/g,
    (match, dir, name) => {
      if (dir === slug) return match; // déjà canonique
      const src = path.join(ROOT, 'public', 'images', 'works', dir, name);
      const dst = path.join(ROOT, 'public', 'images', 'works', slug, name);
      if (!existsSync(src) && !existsSync(dst)) warn(`image manquante : ${match} (œuvre ${slug})`);
      else if (!existsSync(dst)) copy(src, dst);
      // vignette associée (thumbFor() la cherche sous thumbs/<slug>/)
      const thumbSrc = path.join(ROOT, 'public', 'images', 'works', 'thumbs', dir, name);
      const thumbDst = path.join(ROOT, 'public', 'images', 'works', 'thumbs', slug, name);
      if (existsSync(thumbSrc) && !existsSync(thumbDst)) copy(thumbSrc, thumbDst);
      return `/images/works/${slug}/${name}`;
    }
  );
  after = applyVisibility(after);
  if (after !== before) {
    writeFileSync(filePath, after);
    log(`œuvre ${slug} migrée`);
  }
}

/* ------------------------------------------------------------------ */
/* 1b. EXPOSITIONS : /images/expositions/<fichier> → <slug>/<fichier>  */
/* ------------------------------------------------------------------ */
const expoDir = path.join(ROOT, 'src', 'content', 'expositions');
for (const file of readdirSync(expoDir).filter((f) => f.endsWith('.yaml')).sort()) {
  const slug = file.replace(/\.yaml$/, '');
  const filePath = path.join(expoDir, file);
  const before = readFileSync(filePath, 'utf8');
  const after = before.replace(/\/images\/expositions\/([A-Za-z0-9][\w.-]*)(?=["'])/g, (match, name) => {
    if (name === slug) return match; // déjà dans un dossier de slug
    const src = path.join(ROOT, 'public', 'images', 'expositions', name);
    const dst = path.join(ROOT, 'public', 'images', 'expositions', slug, name);
    if (!existsSync(src) && !existsSync(dst)) warn(`image manquante : ${match} (expo ${slug})`);
    else if (!existsSync(dst)) copy(src, dst);
    const thumbSrc = path.join(ROOT, 'public', 'images', 'expositions', 'thumbs', name);
    const thumbDst = path.join(ROOT, 'public', 'images', 'expositions', 'thumbs', slug, name);
    if (existsSync(thumbSrc) && !existsSync(thumbDst)) copy(thumbSrc, thumbDst);
    return `/images/expositions/${slug}/${name}`;
  });
  if (after !== before) {
    writeFileSync(filePath, after);
    log(`exposition ${slug} migrée`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. VISIBILITÉ : visible: true dans Œuvres + Thèmes                  */
/* ------------------------------------------------------------------ */
for (const [dir, kind] of [
  ['works', 'œuvre'],
  ['themes', 'thème'],
]) {
  const base = path.join(ROOT, 'src', 'content', dir);
  for (const file of readdirSync(base).filter((f) => f.endsWith('.yaml')).sort()) {
    const filePath = path.join(base, file);
    const before = readFileSync(filePath, 'utf8');
    const after = applyVisibility(before);
    if (after !== before) {
      writeFileSync(filePath, after);
      log(`${kind} ${file.replace(/\.yaml$/, '')} : visible: true`);
    }
  }
}

log('terminé.');
