import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig, { THEMES, type ThemeValue } from '../../keystatic.config';
import type { Locale } from './i18n';

/** Valeurs historiques des thèmes (clé de migration des œuvres existantes). */
export { THEMES };
export type { ThemeValue } from '../../keystatic.config';

/* ------------------------------------------------------------------ */
/* Thèmes                                                              */
/* ------------------------------------------------------------------ */

/** Thème : titre + accroche + couverture, géré dans Keystatic (« Thèmes »). */
export type Theme = {
  slug: string;
  title: string;
  tagline: string | null;
  cover: string | null;
  /** Slug de l'œuvre de couverture choisie dans le CMS (sans image téléversée). */
  coverWork: string | null;
  intro: string | null;
};

const FALLBACK_COVERS: Record<string, string> = {
  'arch-fenetres-tours-nuages': '/images/works/arch-fenetres-tours-nuages/paradise-en-cours.webp',
  bath: '/images/works/bath/bains.webp',
  'grands-parents': '/images/works/grands-parents/autoroute.webp',
  nature: '/images/works/nature/foret.webp',
  'nature-morte': '/images/works/nature-morte/breakfast.webp',
  portrait: '/images/works/portrait/em-portrait.webp',
};

/**
 * Tous les thèmes : entrées du CMS quand elles existent, sinon repli
 * historique (même ordre que THEMES) pour ne jamais perdre une série.
 */
export async function getThemes(locale: Locale = 'fr'): Promise<Theme[]> {
  let entries: { slug: string; entry: Record<string, unknown> }[] = [];
  try {
    entries = (await reader.collections.themes.all()) as typeof entries;
  } catch {
    entries = [];
  }
  const bySlug = new Map(entries.map(({ slug, entry }) => [slug, entry]));

  /* Ordre historique d'abord, puis les éventuels nouveaux thèmes du CMS. */
  const slugs = [...THEMES.map((theme) => theme.value)];
  for (const { slug } of entries) {
    if (!slugs.includes(slug as ThemeValue)) slugs.push(slug as ThemeValue);
  }

  const rawCache = new Map<string, string>();
  const rawYaml = (slug: string): string => {
    if (!rawCache.has(slug)) {
      try {
        rawCache.set(slug, readFileSync(path.join(process.cwd(), 'src', 'content', 'themes', `${slug}.yaml`), 'utf8'));
      } catch {
        rawCache.set(slug, '');
      }
    }
    return rawCache.get(slug) ?? '';
  };

  return slugs.map((slug) => {
    const entry = (bySlug.get(slug) ?? {}) as {
      title?: string;
      titleEn?: string | null;
      tagline?: string | null;
      taglineEn?: string | null;
      cover?: string | null;
      intro?: string | null;
      introEn?: string | null;
    };
    const historic = THEMES.find((theme) => theme.value === slug);
    const yaml = rawYaml(slug);
    const coverWorkMatch = yaml.match(/^coverWork:\s*(.+)\s*$/m);
    return {
      slug,
      title:
        pick(locale, entry.title ?? historic?.label, entry.titleEn ?? historic?.labelEn) ??
        historic?.label ??
        slug,
      tagline: pick(locale, entry.tagline, entry.taglineEn),
      cover: filled(entry.cover) ?? FALLBACK_COVERS[slug] ?? null,
      coverWork: coverWorkMatch?.[1]?.trim() || null,
      intro: pick(locale, entry.intro, entry.introEn),
    };
  });
}

/**
 * Couverture d'un thème depuis le CMS :
 * 1. image de couverture téléversée,
 * 2. sinon image de l'œuvre de couverture choisie,
 * 3. sinon première œuvre du thème,
 * 4. sinon visuel historique.
 */
export async function themeCover(theme: { slug: string; cover: string | null; coverWork?: string | null }, works?: Work[]): Promise<string | null> {
  if (theme.cover) return theme.cover;
  const all = works ?? (await getWorks());
  if (theme.coverWork) {
    const found = all.find((work) => work.slug === theme.coverWork);
    if (found?.image) return found.image;
  }
  return all.find((work) => work.theme === theme.slug)?.image ?? FALLBACK_COVERS[theme.slug] ?? null;
}

/** Un thème par son slug (repli historique si absent du CMS). */
export async function getTheme(slug: string, locale: Locale = 'fr'): Promise<Theme | null> {
  const themes = await getThemes(locale);
  return themes.find((theme) => theme.slug === slug) ?? null;
}

/** Lecteur de contenu Keystatic : lit les fichiers de src/content au build. */
export const reader = createReader(process.cwd(), keystaticConfig);

export type Work = {
  slug: string;
  title: string;
  /** Slug du thème (relation vers la collection `themes`). */
  theme: string;
  image: string;
  gallery: string[];
  year: string | null;
  dimensions: string | null;
  technique: string | null;
  description: string | null;
  featured: boolean;
  available: boolean;
};

export type Settings = {
  siteName: string;
  tagline: string;
  metaDescription: string;
  shareImage: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  socials: { label: string; url: string }[];
  footerNote: string | null;
  copyright: string;
};

/** Exposition : lieu + dates + photos d'accrochage (collection séparée des œuvres). */
export type Exposition = {
  slug: string;
  title: string;
  type: 'personnelle' | 'collective' | 'concours' | 'accrochage';
  location: string | null;
  city: string | null;
  dates: string | null;
  year: string | null;
  cover: string;
  gallery: string[];
  description: string | null;
  link: string | null;
};

export const EXPOSITION_TYPES: Record<Exposition['type'], string> = {
  personnelle: 'Exposition personnelle',
  collective: 'Exposition collective',
  concours: 'Salon, concours, prix',
  accrochage: 'Vues d’accrochage',
};

export const EXPOSITION_TYPES_EN: Record<Exposition['type'], string> = {
  personnelle: 'Solo exhibition',
  collective: 'Group exhibition',
  concours: 'Art fair, competition, prize',
  accrochage: 'Installation views',
};

/** Libellé du type d'exposition, dans la langue demandée. */
export function expositionType(type: Exposition['type'], locale: Locale = 'fr'): string {
  return locale === 'en' ? EXPOSITION_TYPES_EN[type] : EXPOSITION_TYPES[type];
}

export type Homepage = {
  heroTitle: string;
  heroSubtitle: string | null;
  heroMediaType: 'image' | 'video';
  heroImage: string | null;
  heroVideoUrl: string | null;
  heroCaption: string | null;
  introTitle: string | null;
  introText: string | null;
  selection: string[];
  worksLinkLabel: string;
};

export type About = {
  title: string;
  portrait: string | null;
  portraitCaption: string | null;
  bioVideoMp4: string | null;
  bioVideoWebm: string | null;
  bioVideoPoster: string | null;
  bioVideoCaption: string | null;
  bio: string;
  quote: string | null;
  cvTitle: string;
  exhibitions: string[];
  awards: string[];
  training: string[];
  experience: string[];
  contactIntro: string | null;
};

/* ------------------------------------------------------------------ */
/* Valeurs de repli (si un fichier de contenu est absent)              */
/* ------------------------------------------------------------------ */

const FALLBACK_SETTINGS: Settings = {
  siteName: 'Yann Jaime',
  tagline: 'Peintre',
  metaDescription:
    'Portfolio de Yann Jaime, peintre suisse-chilien : peintures d’architectures, d’intérieurs et de figures, série Tours Nuages.',
  shareImage: null,
  email: 'sepulveda_yann@yahoo.fr',
  phone: null,
  location: 'Paris — Lausanne',
  socials: [],
  footerNote: 'Toutes les œuvres sont protégées par le droit d’auteur.',
  copyright: '© Yann Jaime',
};

/** Replis anglais des textes globaux (utilisés si le champ CMS est vide). */
const FALLBACK_EN = {
  tagline: 'Painter',
  metaDescription:
    'Portfolio of Yann Jaime, Swiss-Chilean painter: paintings of architecture, interiors and figures, and the Tours Nuages series.',
  footerNote: 'All works are protected by copyright.',
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

/** Traite les `null` renvoyés par le CMS pour un champ texte laissé vide. */
function filled(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Choisit le texte de la langue demandée, avec repli systématique sur le
 * français : l'artiste remplit l'anglais champ par champ, sans jamais casser
 * la version anglaise du site (un champ vide = texte français affiché).
 */
function pick(
  locale: Locale,
  frValue: string | null | undefined,
  enValue: string | null | undefined
): string | null {
  if (locale === 'en') return filled(enValue) ?? filled(frValue);
  return filled(frValue);
}

/** Texte de repli par langue (champ CMS absent ou vide des deux côtés). */
function fallbackText(locale: Locale, frValue: string, enValue: string): string {
  return locale === 'en' ? enValue : frValue;
}

/** Découpe un texte multiligne en paragraphes (une ligne vide = nouveau paragraphe). */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

/** Libellé historique d'un thème (repli quand le CMS ne le définit pas). */
export function themeLabel(value: string, locale: Locale = 'fr'): string {
  const found = THEMES.find((t) => t.value === value);
  if (!found) return value;
  return locale === 'en' ? found.labelEn : found.label;
}

/** Libellé lisible d'un thème (ancrage, mots-clés SEO) depuis le CMS, par langue. */
export async function themeTitle(value: string, locale: Locale = 'fr'): Promise<string> {
  const theme = await getTheme(value, locale);
  if (theme) return theme.title;
  return themeLabel(value, locale);
}

/**
 * Version légère (vignette) d'une image de grille.
 * `npm run images:optimize` produit les vignettes dans
 * `public/images/works/thumbs/…` et `public/images/expositions/thumbs/…` ;
 * on y renvoie si elles existent.
 */
export function thumbFor(image: string): string {
  const match = image.match(/^\/images\/(works|expositions)\/(.+)$/);
  if (!match) return image;
  const candidate = `/images/${match[1]}/thumbs/${match[2]}`;
  const onDisk = path.join(process.cwd(), 'public', candidate.replace(/^\//, ''));
  return existsSync(onDisk) ? candidate : image;
}

/* ------------------------------------------------------------------ */
/* Dimensions des images                                               */
/* ------------------------------------------------------------------ */

type ManifestEntry = { file?: string; width?: number; height?: number };

/**
 * Dimensions réelles des images optimisées, lues dans les manifestes de
 * `npm run images:optimize`. Elles alimentent les attributs `width`/`height`
 * (pas de saut de mise en page — bon pour le référencement et l'affichage).
 */
const IMAGE_SIZES: Map<string, { width: number; height: number }> = (() => {
  const map = new Map<string, { width: number; height: number }>();

  for (const name of ['images-manifest.json', 'expositions-manifest.json']) {
    const file = path.join(process.cwd(), 'src', 'data', name);
    if (!existsSync(file)) continue;
    try {
      const entries = JSON.parse(readFileSync(file, 'utf8')) as ManifestEntry[];
      for (const entry of entries) {
        if (entry?.file && entry.width && entry.height) {
          map.set(entry.file, { width: entry.width, height: entry.height });
        }
      }
    } catch {
      /* manifeste illisible : on retombe sur un ratio par défaut */
    }
  }

  return map;
})();

/** Dimensions d'une image (repli : ratio 4/3, jamais bloquant). */
export function imageSize(src: string | null | undefined): { width: number; height: number } {
  if (src) {
    const found = IMAGE_SIZES.get(src);
    if (found) return found;
  }
  return { width: 1200, height: 900 };
}

/** Ligne de métadonnées d'une œuvre : technique, dimensions, année. */
export function workMeta(work: Pick<Work, 'technique' | 'dimensions' | 'year'>): string[] {
  return [filled(work.technique), filled(work.dimensions), filled(work.year)].filter(
    (value): value is string => value !== null
  );
}

/**
 * Dimensions (en cm) extraites d'un texte libre — « 102 × 73 × 2,5 cm ».
 * Sert aux données structurées VisualArtwork (width/height).
 */
export function artworkSize(
  dimensions: string | null | undefined
): { width: number; height: number } | null {
  if (!dimensions) return null;
  const numbers = dimensions.replace(/,/g, '.').match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;

  const [width, height] = numbers.map(Number);
  if (!width || !height) return null;
  return { width, height };
}

/** Présentation d'un thème depuis la collection `themes` (null si absente). */
export async function themeIntro(theme: string, locale: Locale = 'fr'): Promise<string | null> {
  const found = await getTheme(theme, locale);
  return found && found.intro && found.intro.length > 0 ? found.intro : null;
}

/* ------------------------------------------------------------------ */
/* Lecture des contenus                                                */
/* ------------------------------------------------------------------ */

export async function getSettings(locale: Locale = 'fr'): Promise<Settings> {
  const entry = await reader.singletons.settings.read();
  if (!entry) {
    return {
      ...FALLBACK_SETTINGS,
      tagline: fallbackText(locale, FALLBACK_SETTINGS.tagline, FALLBACK_EN.tagline),
      metaDescription: fallbackText(
        locale,
        FALLBACK_SETTINGS.metaDescription,
        FALLBACK_EN.metaDescription
      ),
      footerNote: locale === 'en' ? FALLBACK_EN.footerNote : FALLBACK_SETTINGS.footerNote,
    };
  }

  return {
    siteName: filled(entry.siteName) ?? FALLBACK_SETTINGS.siteName,
    tagline:
      pick(locale, entry.tagline, entry.taglineEn) ??
      fallbackText(locale, FALLBACK_SETTINGS.tagline, FALLBACK_EN.tagline),
    metaDescription:
      pick(locale, entry.metaDescription, entry.metaDescriptionEn) ??
      fallbackText(locale, FALLBACK_SETTINGS.metaDescription, FALLBACK_EN.metaDescription),
    shareImage: filled(entry.shareImage),
    email: filled(entry.email) ?? FALLBACK_SETTINGS.email,
    phone: filled(entry.phone),
    location: filled(entry.location),
    socials: (entry.socials ?? [])
      .filter((social) => Boolean(social?.label && social?.url))
      .map((social) => ({ label: social!.label.trim(), url: social!.url.trim() })),
    footerNote:
      pick(locale, entry.footerNote, entry.footerNoteEn) ??
      (locale === 'en' ? FALLBACK_EN.footerNote : null),
    copyright: filled(entry.copyright) ?? FALLBACK_SETTINGS.copyright,
  };
}

/** Toutes les œuvres, de la plus récente à la plus ancienne. */
export async function getWorks(locale: Locale = 'fr'): Promise<Work[]> {
  const entries = await reader.collections.works.all();
  const sortLocale = locale === 'en' ? 'en' : 'fr';

  return entries
    .map(({ slug, entry }) => ({
      slug,
      title: pick(locale, entry.title, entry.titleEn) ?? slug,
      /* Relation `themes` (slug) ou ancienne valeur textuelle du sélecteur. */
      theme: String(entry.theme ?? '') as Work['theme'],
      image: filled(entry.image) ?? '',
      gallery: (entry.gallery ?? []).filter((img): img is string => Boolean(img)),
      year: filled(entry.year),
      dimensions: filled(entry.dimensions),
      technique: filled(entry.technique),
      description: pick(locale, entry.description, entry.descriptionEn),
      featured: Boolean(entry.featured),
      available: entry.available ?? true,
    }))
    .sort((a, b) => {
      const yearA = Number(a.year ?? 0);
      const yearB = Number(b.year ?? 0);
      if (yearB !== yearA) return yearB - yearA;
      return a.title.localeCompare(b.title, sortLocale);
    });
}

export async function getWork(slug: string, locale: Locale = 'fr'): Promise<Work | null> {
  const works = await getWorks(locale);
  return works.find((work) => work.slug === slug) ?? null;
}

/** Œuvres voisines (précédente / suivante) dans l'ordre d'affichage. */
export async function getWorkNeighbours(
  slug: string,
  locale: Locale = 'fr'
): Promise<{ prev: Work | null; next: Work | null }> {
  const works = await getWorks(locale);
  const index = works.findIndex((work) => work.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? works[index - 1] : null,
    next: index < works.length - 1 ? works[index + 1] : null,
  };
}

export async function getHomepage(locale: Locale = 'fr'): Promise<Homepage> {
  const fallback: Homepage = {
    heroTitle: 'Yann Jaime',
    heroSubtitle: 'Portfolio 2021-2026',
    heroMediaType: 'image',
    heroImage: null,
    heroVideoUrl: null,
    heroCaption: null,
    introTitle: null,
    introText: null,
    selection: [],
    worksLinkLabel: fallbackText(locale, 'Voir toutes les œuvres', 'View all works'),
  };

  const entry = await reader.singletons.homepage.read();
  if (!entry) return fallback;

  return {
    heroTitle: pick(locale, entry.heroTitle, entry.heroTitleEn) ?? fallback.heroTitle,
    heroSubtitle: pick(locale, entry.heroSubtitle, entry.heroSubtitleEn),
    heroMediaType: entry.heroMediaType === 'video' ? 'video' : 'image',
    heroImage: filled(entry.heroImage),
    heroVideoUrl: filled(entry.heroVideoUrl),
    heroCaption: pick(locale, entry.heroCaption, entry.heroCaptionEn),
    introTitle: pick(locale, entry.introTitle, entry.introTitleEn),
    introText: pick(locale, entry.introText, entry.introTextEn),
    selection: (entry.selection ?? []).filter((slug): slug is string => Boolean(slug)),
    worksLinkLabel:
      pick(locale, entry.worksLinkLabel, entry.worksLinkLabelEn) ?? fallback.worksLinkLabel,
  };
}

export async function getAbout(locale: Locale = 'fr'): Promise<About> {
  const fallback: About = {
    title: fallbackText(locale, 'À propos', 'About'),
    portrait: null,
    portraitCaption: null,
    bio: '',
    quote: null,
    cvTitle: fallbackText(locale, 'Repères', 'Milestones'),
    exhibitions: [],
    awards: [],
    training: [],
    experience: [],
    contactIntro: null,
    bioVideoMp4: null,
    bioVideoWebm: null,
    bioVideoPoster: null,
    bioVideoCaption: null,
  };

  const entry = await reader.singletons.about.read();
  if (!entry) return fallback;

  const list = (values: readonly (string | null)[] | null | undefined): string[] =>
    (values ?? [])
      .map((value) => filled(value))
      .filter((value): value is string => value !== null);

  return {
    title: pick(locale, entry.title, entry.titleEn) ?? fallback.title,
    portrait: filled(entry.portrait),
    portraitCaption: filled(entry.portraitCaption),
    bioVideoMp4: filled(entry.bioVideoMp4),
    bioVideoWebm: filled(entry.bioVideoWebm),
    bioVideoPoster: filled(entry.bioVideoPoster),
    bioVideoCaption: filled(entry.bioVideoCaption),
    bio: pick(locale, entry.bio, entry.bioEn) ?? '',
    quote: pick(locale, entry.quote, entry.quoteEn),
    cvTitle: pick(locale, entry.cvTitle, entry.cvTitleEn) ?? fallback.cvTitle,
    exhibitions: list(entry.exhibitions),
    awards: list(entry.awards),
    training: list(entry.training),
    experience: list(entry.experience),
    contactIntro: pick(locale, entry.contactIntro, entry.contactIntroEn),
  };
}

/* ------------------------------------------------------------------ */
/* Expositions                                                         */
/* ------------------------------------------------------------------ */

/** Toutes les expositions, de la plus récente à la plus ancienne. */
export async function getExpositions(locale: Locale = 'fr'): Promise<Exposition[]> {
  const entries = await reader.collections.expositions.all();
  const sortLocale = locale === 'en' ? 'en' : 'fr';

  return entries
    .map(({ slug, entry }) => ({
      slug,
      title: pick(locale, entry.title, entry.titleEn) ?? slug,
      type: (entry.type ?? 'collective') as Exposition['type'],
      location: filled(entry.location),
      city: filled(entry.city),
      dates: filled(entry.dates),
      year: filled(entry.year),
      cover: filled(entry.cover) ?? '',
      gallery: (entry.gallery ?? []).filter((img): img is string => Boolean(img)),
      description: pick(locale, entry.description, entry.descriptionEn),
      link: filled(entry.link),
    }))
    .sort((a, b) => {
      const yearA = Number(a.year ?? 0);
      const yearB = Number(b.year ?? 0);
      if (yearB !== yearA) return yearB - yearA;
      return a.title.localeCompare(b.title, sortLocale);
    });
}

export async function getExposition(
  slug: string,
  locale: Locale = 'fr'
): Promise<Exposition | null> {
  const expositions = await getExpositions(locale);
  return expositions.find((exposition) => exposition.slug === slug) ?? null;
}

/** Expositions voisines (précédente / suivante) dans l'ordre d'affichage. */
export async function getExpositionNeighbours(
  slug: string,
  locale: Locale = 'fr'
): Promise<{ prev: Exposition | null; next: Exposition | null }> {
  const expositions = await getExpositions(locale);
  const index = expositions.findIndex((exposition) => exposition.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? expositions[index - 1] : null,
    next: index < expositions.length - 1 ? expositions[index + 1] : null,
  };
}

/** Ligne de métadonnées d'une exposition : lieu, ville, dates. */
export function expositionMeta(
  exposition: Pick<Exposition, 'location' | 'city' | 'dates'>
): string[] {
  const place = [exposition.location, exposition.city]
    .filter((value): value is string => Boolean(value))
    .join(', ');
  return [place.length > 0 ? place : null, exposition.dates].filter(
    (value): value is string => value !== null
  );
}

/** Œuvres d'une série — alimente les pages /oeuvres/serie/<theme>. */
export async function getWorksByTheme(theme: string, locale: Locale = 'fr'): Promise<Work[]> {
  const works = await getWorks(locale);
  return works.filter((work) => work.theme === theme);
}