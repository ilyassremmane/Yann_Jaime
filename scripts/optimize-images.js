#!/usr/bin/env node
/**
 * optimize-images.js
 * ------------------------------------------------------------------
 * Parcourt les sous-dossiers de thèmes du dossier source de l'artiste,
 * redimensionne, compresse en WebP et range le résultat dans
 * l'arborescence publique du projet Astro.
 *
 *   source :  <SOURCE>/<THEME>/*.jpg|jpeg|png|webp|tif|heic
 *             ou <SOURCE>/*.jpg… si le dossier ne contient pas de sous-dossiers
 *   sortie :  public/images/works/<theme>/<slug>/<slug>.webp         (max 1920 px, q80)
 *             public/images/works/thumbs/<theme>/<slug>/<slug>.webp  (max  720 px, q72)
 *             (un dossier par œuvre : c'est le rangement qu'impose le CMS,
 *              chaque œuvre ayant ses images dans son propre dossier)
 *
 * Usage :
 *   npm run images:optimize
 *   node scripts/optimize-images.js --src="/chemin/vers/sources" --width=1920 --quality=80
 *
 * Options :
 *   --src=<dossier>          dossier contenant les sous-dossiers de thèmes
 *   --out=<dossier>          dossier de sortie (défaut : public/images/works)
 *   --manifest=<fichier>     manifeste JSON écrit (défaut : src/data/images-manifest.json)
 *   --width=<px>             largeur maximale des images (défaut 1920)
 *   --quality=<1-100>        qualité WebP des images (défaut 80)
 *   --thumb-width=<px>       largeur maximale des vignettes (défaut 720)
 *   --thumb-quality=<1-100>  qualité WebP des vignettes (défaut 72)
 *   --concurrency=<n>        nombre de conversions simultanées (défaut 4)
 *   --keep-order-prefix      conserve les préfixes numériques (01_, 02_…) dans les noms
 *
 * Exemple — expositions (dossier plat, sortie séparée) :
 *   node scripts/optimize-images.js \
 *     --src="/chemin/vers/Yann_sources/EXPOS" \
 *     --out=public/images/expositions \
 *     --manifest=src/data/expositions-manifest.json
 */

import { readdir, mkdir, stat, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2).map((arg) => arg.replace(/^--/, ''));
const getArg = (name) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};

/** Dossiers source testés dans l'ordre si --src n'est pas fourni. */
const DEFAULT_SOURCES = [
  '/Users/remmane/Desktop/media/web/Yann_sources/PEINTURES',
  '/Users/remmane/Desktop/media/web/Yann_source/PEINTURES',
  path.join(ROOT, 'sources'),
];

const SRC_DIR = getArg('src') ?? DEFAULT_SOURCES[0];
const OUT_BASE = path.resolve(ROOT, getArg('out') ?? 'public/images/works');
const MANIFEST_PATH = path.resolve(ROOT, getArg('manifest') ?? 'src/data/images-manifest.json');

/** Préfixe d'URL publique correspondant à `--out` (ex. /images/expositions). */
const OUT_URL = `/${path
  .relative(path.join(ROOT, 'public'), OUT_BASE)
  .split(path.sep)
  .join('/')}`;

const MAX_WIDTH = Number(getArg('width') ?? 1920);
const QUALITY = Number(getArg('quality') ?? 80);
const THUMB_WIDTH = Number(getArg('thumb-width') ?? 720);
const THUMB_QUALITY = Number(getArg('thumb-quality') ?? 72);
const CONCURRENCY = Math.max(1, Number(getArg('concurrency') ?? 4));
const KEEP_PREFIX = args.includes('keep-order-prefix');

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.heif', '.avif']);

/** Fichiers temporaires créés pour les formats non lus par sharp (HEIC). */
const TEMP_FILES = [];

/**
 * Certains formats (HEIC/HEIF des iPhone) ne sont pas décodables par le binaire
 * précompilé de sharp. Sur macOS, on les convertit d'abord à la volée avec `sips`.
 */
async function toReadablePath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isHeif = ext === '.heic' || ext === '.heif';
  if (!isHeif || process.platform !== 'darwin') return filePath;

  const out = path.join(
    tmpdir(),
    `yann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  );
  try {
    await execFileAsync('sips', ['-s', 'format', 'jpeg', filePath, '--out', out]);
  } catch (error) {
    throw new Error(
      `conversion HEIC impossible (${error.message.split('\n')[0]}). Exportez l’image en JPG ou PNG.`
    );
  }
  TEMP_FILES.push(out);
  return out;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

/**
 * Nom de fichier → slug lisible par le web.
 * "02_PARADISE_EN_COURS.jpg" → "02-paradise-en-cours"
 * (le préfixe d'ordre est retiré sauf avec --keep-order-prefix)
 */
function slugify(name) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return KEEP_PREFIX ? base : base.replace(/^\d{1,3}-/, '');
}

/** Un fichier est-il exploitable comme image ? */
async function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (EXTENSIONS.has(ext)) return true;
  if (ext !== '') return false;
  // Fichier sans extension (ex. « SALLE ») : on tente de lire les métadonnées
  try {
    const meta = await sharp(filePath, { failOn: 'none' }).metadata();
    return Boolean(meta.format);
  } catch {
    return false;
  }
}

/** Conversion d'une image : WebP pleine taille + vignette. */
async function optimizeFile(filePath, themeSlug, results) {
  const sourceName = path.basename(filePath);
  const slug = slugify(path.basename(filePath, path.extname(filePath)));
  // Chemin réellement lisible par sharp (conversion HEIC → JPEG si nécessaire)
  const readablePath = await toReadablePath(filePath);

  /*
   * Rangement imposé par le CMS : dossier du thème puis dossier de l'œuvre.
   * Un dossier source plat (expositions…) reste à la racine du dossier de sortie.
   */
  const parts = themeSlug ? [themeSlug, slug] : [];
  const fullDir = path.join(OUT_BASE, ...parts);
  const thumbDir = path.join(OUT_BASE, 'thumbs', ...parts);
  await mkdir(fullDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });

  /** URL publique d'un fichier produit (`thumbs` = vignette). */
  const urlFor = (prefix) =>
    [OUT_URL, prefix, ...parts, `${slug}.webp`].filter(Boolean).join('/');

  const base = sharp(readablePath, { failOn: 'none' }).rotate();
  const meta = await base.metadata();

  const resize = (width) =>
    meta.width && meta.width > width ? { width, withoutEnlargement: true } : {};

  const fullPath = path.join(fullDir, `${slug}.webp`);
  const thumbPath = path.join(thumbDir, `${slug}.webp`);

  const full = await sharp(readablePath, { failOn: 'none' })
    .rotate()
    .resize(resize(MAX_WIDTH))
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(fullPath);

  await sharp(readablePath, { failOn: 'none' })
    .rotate()
    .resize(resize(THUMB_WIDTH))
    .webp({ quality: THUMB_QUALITY, effort: 4 })
    .toFile(thumbPath);

  results.push({
    theme: themeSlug || null,
    source: sourceName,
    file: urlFor(),
    thumb: urlFor('thumbs'),
    width: full.width,
    height: full.height,
    bytes: full.size,
    srcWidth: meta.width ?? null,
    srcHeight: meta.height ?? null,
    srcBytes: (await stat(filePath)).size,
  });

  console.log(
    `  ✓ ${path.relative(OUT_BASE, fullPath)}  ${(full.size / 1024).toFixed(0)} Ko` +
      `  (source ${((await stat(filePath)).size / 1024 / 1024).toFixed(1)} Mo, ${meta.width}×${meta.height})`
  );
}

/* ------------------------------------------------------------------ */
/* Parcours des thèmes                                                 */
/* ------------------------------------------------------------------ */

/** Liste récursive (1 niveau) des images d'un dossier de thème. */
async function listImages(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue; // .DS_Store, ._fichiers AppleDouble…
    const full = path.join(dir, entry);
    const info = await stat(full).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) continue;
    if (await isImage(full)) files.push(full);
  }

  return files.sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Exécute les tâches par paquets de `CONCURRENCY`. */
async function runPool(items, handler) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await handler(items[index]);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log('Optimisation des images → WebP');
  console.log(`  source         : ${SRC_DIR}`);
  console.log(`  sortie         : ${OUT_BASE}  (URL ${OUT_URL})`);
  console.log(`  manifeste      : ${MANIFEST_PATH}`);
  console.log(`  images         : ${MAX_WIDTH} px max, qualité ${QUALITY}`);
  console.log(`  vignettes      : ${THUMB_WIDTH} px max, qualité ${THUMB_QUALITY}`);
  console.log(`  simultanées    : ${CONCURRENCY}`);
  console.log('---');

  const sourceStat = await stat(SRC_DIR).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    console.error(`Dossier source introuvable : ${SRC_DIR}`);
    console.error('Précisez le dossier avec --src="/chemin/vers/les/themes"');
    process.exit(1);
  }

  const subdirectories = (await readdir(SRC_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);

  /*
   * Deux cas de figure :
   *  - la source contient des sous-dossiers → chacun est un thème (PEINTURES/BATH…) ;
   *  - la source est plate (EXPOS) → toutes les images forment un seul groupe,
   *    rangé directement dans le dossier de sortie.
   */
  const groups =
    subdirectories.length > 0
      ? subdirectories.map((name) => ({ name, dir: path.join(SRC_DIR, name), themed: true }))
      : [{ name: path.basename(path.resolve(SRC_DIR)), dir: SRC_DIR, themed: false }];

  if (subdirectories.length === 0) {
    console.log(`Dossier plat « ${groups[0].name} » : aucune sous-catégorie`);
  }

  const results = [];
  const failures = [];

  for (const group of groups) {
    const themeSlug = group.themed ? slugify(group.name) : '';
    const files = await listImages(group.dir);

    console.log(`\n▸ ${group.name}${themeSlug ? ` → ${themeSlug}` : ''}  (${files.length} image(s))`);

    await runPool(files, async (file) => {
      try {
        await optimizeFile(file, themeSlug, results);
      } catch (error) {
        failures.push({ file, message: error.message });
        console.error(`  ✗ ${path.basename(file)} : ${error.message}`);
      }
    });
  }

  results.sort((a, b) => a.file.localeCompare(b.file));

  if (results.length > 0) {
    await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
    await writeFile(MANIFEST_PATH, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  }

  const totalBytes = results.reduce((sum, item) => sum + item.bytes, 0);
  const sourceBytes = results.reduce((sum, item) => sum + item.srcBytes, 0);

  await Promise.all(TEMP_FILES.map((file) => rm(file, { force: true })));

  console.log('\n---');
  console.log(`${results.length} image(s) optimisée(s) — ${(totalBytes / 1024 / 1024).toFixed(2)} Mo (source ${(sourceBytes / 1024 / 1024).toFixed(1)} Mo)`);
  if (sourceBytes > 0) {
    console.log(`Compression : ${(100 - (totalBytes / sourceBytes) * 100).toFixed(0)} % de poids en moins`);
  }
  console.log(`Manifeste : ${MANIFEST_PATH}`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} fichier(s) ignoré(s) :`);
    for (const failure of failures) {
      console.error(`  - ${path.basename(failure.file)} : ${failure.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});