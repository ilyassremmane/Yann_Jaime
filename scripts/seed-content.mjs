#!/usr/bin/env node
/**
 * seed-content.mjs
 * ------------------------------------------------------------------
 * Crée les fiches YAML de la collection « Œuvres » à partir du manifeste
 * produit par `npm run images:optimize`.
 *
 * Les métadonnées connues du portfolio 2021-2026 (titre, année, technique,
 * dimensions) sont pré-remplies ; les autres images reçoivent un titre lisible
 * déduit du nom de fichier, à compléter ensuite dans /keystatic.
 *
 * Usage :
 *   npm run content:seed              (ne touche pas aux fiches existantes)
 *   npm run content:seed -- --force   (réécrit tout)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'src', 'data', 'images-manifest.json');
const OUT_DIR = path.join(ROOT, 'src', 'content', 'works');
const FORCE = process.argv.includes('--force');

/**
 * Métadonnées confirmées (dossier « Portfolio 2021-2026 »).
 * Clé = slug du fichier source, sans extension.
 */
const CURATED = {
  // Série Tours Nuages — Nanterre (architectures)
  'paradise-en-cours': {
    title: 'Paradise',
    year: '2024',
    technique: 'Huile sur canevas',
    dimensions: '102 × 73 × 2,5 cm',
    description: 'Série Tours Nuages — Nanterre.',
    featured: true,
  },
  'full-moon': {
    title: 'Full Moon',
    year: '2024',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    description: 'Série Tours Nuages — Nanterre.',
    featured: true,
  },
  'pause-final': {
    title: 'Pause',
    year: '2024',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    description: 'Série Tours Nuages — Nanterre.',
    featured: true,
  },
  'new-departure': {
    title: 'Nouveau départ',
    year: '2024',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    description: 'Série Tours Nuages — Nanterre.',
  },
  'tn-etoile': {
    title: 'Tours Nuages — Étoile',
    technique: 'Huile sur canevas',
    description: 'Série Tours Nuages — Nanterre.',
  },
  'chess-player': {
    title: 'Chess player',
    year: '2021',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    featured: true,
  },
  'hard-work': {
    title: 'Hard Work',
    year: '2024',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    featured: true,
  },
  'lazy-afternoon': {
    title: 'Lazy afternoon',
    year: '2026',
    technique: 'Acrylique sur papier',
    dimensions: '72 × 72 × 3 cm',
  },
  'scene-chambre-03': {
    title: 'Scènes de crime — chambre',
    year: '2021',
    technique: 'Huile sur toile',
    dimensions: '120 × 60 × 3 cm',
  },
  'scene-cuisine-01': {
    title: 'Scènes de crime — cuisine',
    year: '2021',
    technique: 'Huile sur toile',
    dimensions: '120 × 60 × 3 cm',
  },
  'scene-salon-02': {
    title: 'Scènes de crime — salon',
    year: '2021',
    technique: 'Huile sur toile',
    dimensions: '120 × 60 × 3 cm',
  },

  // Bains, bassins et résurgences
  'celtic-fountains': {
    title: 'Fountains',
    year: '2023',
    technique: 'Huile sur canevas',
    dimensions: '92 × 73 × 2,5 cm',
    featured: true,
  },
  'rebirth-01': {
    title: 'Rebirth',
    year: '2025',
    technique: 'Huile sur canevas',
    dimensions: '102 × 73 × 2,5 cm',
    featured: true,
  },

  // Natures mortes
  'teatime': {
    title: 'Tea Time',
    year: '2022',
    technique: 'Acrylique sur papier',
    dimensions: '50 × 65 cm',
    featured: true,
  },
  'banana-02': {
    title: 'Bananes, scotch et cuttet',
    year: '2021',
    technique: 'Huile sur canevas',
    dimensions: '38 × 45 × 2,5 cm',
  },
  breakfast: {
    title: 'Breakfast',
    year: '2021',
    technique: 'Huile sur canevas',
    dimensions: '33 × 41 × 2,5 cm',
  },
  'breakfast-2': {
    title: 'Breakfast — détail',
    year: '2021',
    technique: 'Huile sur canevas',
    dimensions: '33 × 41 × 2,5 cm',
  },
  'nm-orch': {
    title: 'White Orchid',
    year: '2021',
    technique: 'Huile sur toile',
    dimensions: '40 × 25 cm',
  },
  'nm-possons': {
    title: 'Poissons',
    technique: 'Huile sur toile',
  },

  // Natures
  'laval-1': {
    title: 'Laval n°1',
    year: '2025',
    technique: 'Huile sur toile',
    dimensions: '46 × 33 cm',
  },
  'laval-2': {
    title: 'Laval n°2',
    year: '2025',
    technique: 'Huile sur toile',
  },
  foret: { title: 'Forêt' },

  // Expositions
  'expo-milan-septembre': {
    title: 'Exposition — Milan',
    year: '2023',
    description: 'Vue d’accrochage — PassepARTout Gallery, Milan, 2023.',
  },
  'chelsea-2033': {
    title: 'Chelsea International Fine Art Competition',
    year: '2024',
    description: '38th Chelsea International Fine Art Competition, New York, 2024.',
  },
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const CAMERA = /^(img|image|dsc|dscn|dsiq|pxl|photo|gopr|vid|_mg)$/i;
const HASHY = /^[0-9a-f]{8}-[0-9a-f-]{8,}$/i;
/** Petits mots qui restent en minuscules dans un titre. */
const STOPWORD = /^(de|du|des|la|le|les|et|en|un|une|au|aux|of|the|and)$/i;

/** Titre lisible déduit d'un nom de fichier, faute de mieux. */
function titleFromFilename(sourceName) {
  const base = path.basename(sourceName, path.extname(sourceName));
  if (HASHY.test(base)) return 'Sans titre';

  const tokens = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  while (tokens.length > 1 && /^\d{1,2}$/.test(tokens[0])) tokens.shift();
  if (tokens.length === 0) return 'Sans titre';
  if (CAMERA.test(tokens[0])) return 'Sans titre';
  if (/^[0-9a-f]{8}$/i.test(tokens[0]) && tokens.length > 2) return 'Sans titre';

  return tokens
    .map((token, index) => {
      if (index > 0 && STOPWORD.test(token)) return token.toLowerCase(); // « Salle DE Bain » → « Salle de bain »
      if (token.length <= 3 && token === token.toUpperCase()) return token; // EM, YJ, YM…
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Chaîne sûre pour YAML (une chaîne JSON est du YAML valide). */
const str = (value) => JSON.stringify(value);

/** Document YAML d'une œuvre, au format attendu par Keystatic. */
function yamlDoc(work) {
  const lines = [
    `title: ${str(work.title)}`,
    `theme: ${work.theme}`,
    `image: ${str(work.image)}`,
    'gallery: []',
    `year: ${str(work.year ?? '')}`,
    `dimensions: ${str(work.dimensions ?? '')}`,
    `technique: ${str(work.technique ?? '')}`,
    `description: ${str(work.description ?? '')}`,
    `featured: ${work.featured ? 'true' : 'false'}`,
    `available: ${work.available === false ? 'false' : 'true'}`,
  ];
  return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ */
/* Génération                                                          */
/* ------------------------------------------------------------------ */

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    console.error(`Manifeste introuvable : ${MANIFEST}`);
    console.error('Lancez d’abord : npm run images:optimize');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const seen = new Set();
  const written = [];
  const skipped = [];

  for (const item of manifest) {
    const slug = path.basename(item.file, '.webp');
    if (seen.has(slug)) {
      skipped.push(`${item.source} (doublon de ${slug})`);
      continue;
    }
    seen.add(slug);

    const curated = CURATED[slug] ?? {};
    const work = {
      title: curated.title ?? titleFromFilename(item.source),
      theme: item.theme,
      image: item.file,
      year: curated.year,
      dimensions: curated.dimensions,
      technique: curated.technique,
      description: curated.description,
      featured: curated.featured ?? false,
      available: true,
    };

    const target = path.join(OUT_DIR, `${slug}.yaml`);
    try {
      await readFile(target);
      if (!FORCE) {
        skipped.push(`${slug}.yaml (déjà présent)`);
        continue;
      }
    } catch {
      /* le fichier n'existe pas encore : on l'écrit */
    }

    await writeFile(target, yamlDoc(work), 'utf8');
    written.push(slug);
  }

  console.log(`${written.length} fiche(s) créée(s) dans ${OUT_DIR}`);
  if (skipped.length > 0) {
    console.log(`${skipped.length} fiche(s) conservée(s) :`);
    for (const entry of skipped) console.log(`  - ${entry}`);
  }
  console.log('\nLes titres déduits des noms de fichiers (« Sans titre », « Img 1608 »…)');
  console.log('sont à compléter dans /keystatic — aucune autre donnée inventée.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});