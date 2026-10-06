#!/usr/bin/env node
/**
 * compress-uploads.js — filet de sécurité automatique des photos
 * ------------------------------------------------------------------
 * Objectif : que l'artiste puisse téléverser UNE PHOTO DIRECTEMENT DEPUIS
 * KEYSTATIC (n'importe quelle taille), sans ligne de code ni terminal.
 *
 * Ce script tourne à chaque build (`prebuild`), au démarrage du serveur de
 * développement (`predev`), et à la demande via `npm run images:safety` :
 *   0. convertit en WebP les formats que les navigateurs ne savent pas
 *      afficher (tif, tiff…) — le fichier est renommé et le YAML de la fiche
 *      (image/gallery/cover) est mis à jour automatiquement ;
 *   1. crée la vignette `thumbs/…` manquante (720 px) ;
 *   2. ré-encode sur place une image trop lourde (> --max-bytes) ou trop
 *      large (> --max-width) — même nom, même format, donc les fichiers
 *      YAML du CMS restent valables ;
 *   3. met à jour les manifestes `src/data/*-manifest.json` (width/height),
 *      qui alimentent les attributs width/height des <img>.
 *
 * Les images déjà optimisées (≤ seuil, vignette présente) sont ignorées :
 * aucune perte de qualité pour le contenu existant, build quasi instantané.
 *
 * Usage :
 *   npm run images:safety            (aussi lancé par `npm run dev` et `npm run build`)
 *   node scripts/compress-uploads.js --dry-run
 *   node scripts/compress-uploads.js --max-bytes=1500000 --max-width=1920
 */

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images');

/* Options */
const rawArgs = process.argv.slice(2).map((arg) => arg.replace(/^--/, ''));
const DRY_RUN = rawArgs.includes('dry-run');
const argOf = (name) => {
  const hit = rawArgs.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};
const MAX_BYTES = Number(argOf('max-bytes') ?? 1_500_000); // 1,5 Mo
const MAX_WIDTH = Number(argOf('max-width') ?? 1920);
const THUMB_WIDTH = Number(argOf('thumb-width') ?? 720);

/* Dossiers où Keystatic téléverse les fichiers des entrées */
const FAMILIES = ['works', 'expositions'];
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
/** Formats affichables tels quels par les navigateurs. */
const WEB_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MANIFEST_BY_FAMILY = {
  works: 'images-manifest.json',
  expositions: 'expositions-manifest.json',
};

/** Encodage, même format que l'extension (le nom de fichier ne bouge pas). */
async function encode(buffer, ext, quality, maxWidth) {
  let pipeline = sharp(buffer, { failOn: 'none' }).rotate(); // EXIF droit
  if (maxWidth) pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return pipeline.jpeg({ quality, progressive: true }).toBuffer();
    case '.png':
      /* Pas de palettisation : une photo d'œuvre réduite à 256 couleurs se dégrade */
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    case '.webp':
      return pipeline.webp({ quality }).toBuffer();
    case '.avif':
      return pipeline.avif({ quality: Math.min(quality, 65) }).toBuffer();
    case '.tif':
    case '.tiff':
      return pipeline.tiff({ quality }).toBuffer();
    default:
      return null;
  }
}
/** Liste récursive des images (vignettes `thumbs/` exclues). */
async function listImages(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'thumbs') continue;
      await listImages(full, out);
    } else if (EXTS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Parcours                                                            */
/* ------------------------------------------------------------------ */

/**
 * Après une conversion (tif → webp), met à jour les références du fichier
 * dans la fiche YAML correspondante : `image:` / `gallery:` (œuvres) ou
 * `cover:` / `gallery:` (expositions). Le chemin public sert de clé.
 */
async function rewriteContentRefs(family, relInFamily, oldPath, newPath) {
  const segments = relInFamily.split(path.sep);
  let yamlPath = null;
  if (family === 'works') {
    const [theme, slug] = segments;
    if (theme && slug) {
      yamlPath = path.join(ROOT, 'src', 'content', 'works', theme, `${slug}.yaml`);
    }
  } else {
    const [slug] = segments;
    if (slug) yamlPath = path.join(ROOT, 'src', 'content', 'expositions', `${slug}.yaml`);
  }
  if (!yamlPath || !existsSync(yamlPath)) return false;
  const text = await readFile(yamlPath, 'utf8');
  if (!text.includes(oldPath)) return false;
  if (!DRY_RUN) await writeFile(yamlPath, text.split(oldPath).join(newPath));
  console.log(`   ↳ ${path.relative(ROOT, yamlPath)} : ${oldPath} → ${newPath}`);
  return true;
}

let compressed = 0;
let thumbsCreated = 0;
let untouched = 0;
let converted = 0;

for (const family of FAMILIES) {
  const root = path.join(PUBLIC_IMAGES, family);
  const images = await listImages(root);
  if (images.length === 0) continue;

  const manifestPath = path.join(ROOT, 'src', 'data', MANIFEST_BY_FAMILY[family]);
  let manifest = [];
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch {
      manifest = [];
    }
  }

  for (const rawPath of images) {
    try {
      /* L'image peut être renommée par la conversion tif → webp (étape 0). */
      let imagePath = rawPath;
      let relInFamily = path.relative(root, imagePath); // thème/…/photo.jpg
      let ext = path.extname(imagePath).toLowerCase();
      let flat = relInFamily.split(path.sep).join('/');
      let publicPath = `/images/${family}/${flat}`;
      let legacyPublicPath = null;

      /* 0. Format que les navigateurs ne savent pas afficher (tif, tiff…) :
           conversion en WebP, l'entrée YAML de la fiche est mise à jour. */
      if (!WEB_EXTS.has(ext)) {
        const webpPath = path.join(
          path.dirname(imagePath),
          `${path.basename(imagePath, ext)}.webp`
        );
        const webpPublic = `${publicPath.slice(0, -ext.length)}.webp`;
        if (!existsSync(webpPath)) {
          const source = await readFile(imagePath);
          const buffer = await sharp(source, { failOn: 'none' })
            .rotate()
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          if (!DRY_RUN) await writeFile(webpPath, buffer);
        }
        if (!DRY_RUN) {
          await rm(imagePath, { force: true });
          /* La fiche YAML doit pointer vers le nouveau nom de fichier. */
          await rewriteContentRefs(family, relInFamily, publicPath, webpPublic);
        }
        converted += 1;
        legacyPublicPath = publicPath;
        imagePath = webpPath;
        relInFamily = path.relative(root, imagePath);
        ext = path.extname(imagePath).toLowerCase();
        flat = relInFamily.split(path.sep).join('/');
        publicPath = webpPublic;
      }

      const original = await readFile(imagePath);
      const meta = await sharp(original, { failOn: 'none' }).metadata();
      const { size } = await stat(imagePath);

      const needCompress = (meta.width ?? 0) > MAX_WIDTH || size > MAX_BYTES;
      const needThumb = !existsSync(path.join(root, 'thumbs', relInFamily));
      /* Image renommée par l'artiste (nouveau fichier) : le manifeste doit
         la prendre en compte, sans quoi width/height tomberont en repli. */
      const hasManifestEntry = manifest.some((item) => item?.file === publicPath);

      /* Rien à faire, sauf si le manifeste doit suivre une conversion ou
         si l'image n'y figure pas encore. */
      if (!needCompress && !needThumb && !legacyPublicPath && hasManifestEntry) {
        untouched += 1;
        continue;
      }

      /* 1. Image pleine taille : ré-encodée seulement si elle dépasse. */
      let current = original;
      if (needCompress) {
        const next = await encode(original, ext, 80, MAX_WIDTH);
        if (next && next.length < original.length) {
          current = next;
          if (!DRY_RUN) await writeFile(imagePath, next);
          compressed += 1;
        }
      }

      /* 2. Vignette : créée si absente (chemin reconstruit après conversion). */
      if (needThumb) {
        const thumbPath = path.join(root, 'thumbs', relInFamily);
        const thumb = await encode(current, ext, 72, THUMB_WIDTH);
        if (thumb) {
          if (!DRY_RUN) {
            await mkdir(path.dirname(thumbPath), { recursive: true });
            await writeFile(thumbPath, thumb);
          }
          thumbsCreated += 1;
        }
      }

      /* 3. Dimensions dans le manifeste (attributs width/height des <img>). */
      const finalMeta = await sharp(current, { failOn: 'none' }).metadata();
      const dimensions = {
        width: finalMeta.width ?? 0,
        height: finalMeta.height ?? 0,
        bytes: Buffer.byteLength(current),
      };
      const thumbUrl = `/images/${family}/thumbs/${flat}`;
      /* Entrée existante (ancien chemin si le fichier a été converti). */
      const entry =
        manifest.find((item) => item?.file === publicPath) ??
        (legacyPublicPath
          ? manifest.find((item) => item?.file === legacyPublicPath)
          : undefined);
      if (entry) {
        Object.assign(entry, { file: publicPath, thumb: thumbUrl, ...dimensions });
      } else {
        const relativeToFamily = relInFamily.split(path.sep);
        manifest.push({
          theme: family === 'works' ? (relativeToFamily[0] ?? null) : null,
          file: publicPath,
          thumb: thumbUrl,
          ...dimensions,
        });
      }
    } catch (error) {
      console.warn(`⚠️  ${path.relative(ROOT, rawPath)} : ${error?.message ?? error}`);
    }
  }

  if (!DRY_RUN) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  `${DRY_RUN ? '[dry-run] ' : ''}photos contrôlées : ${untouched + compressed + thumbsCreated + converted} — ` +
    `${converted} convertie(s) en WebP, ${compressed} compressée(s), ` +
    `${thumbsCreated} vignette(s) créée(s), ${untouched} déjà conformes.`
);

