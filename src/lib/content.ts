import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createReader } from '@keystatic/core/reader';
import { getCollection } from 'astro:content';
import keystaticConfig from '../../keystatic.config';
import type { Locale } from './i18n';

/**
 * Thèmes de référence : ordre et libellés de repli si la collection « Thèmes »
 * du CMS est vide. Une valeur = le nom du fichier dans `src/content/themes/` ;
 * les thèmes créés dans Keystatic sont lus directement dans ce dossier.
 */
const THEMES = [
  { value: 'espaces-habites', label: 'Espaces habités', labelEn: 'Inhabited Spaces' },
  { value: 'bath', label: 'Bath', labelEn: 'Bath' },
  { value: 'flashback', label: 'Flashback', labelEn: 'Flashback' },
  { value: 'nature', label: 'Nature', labelEn: 'Nature' },
  { value: 'nature-morte', label: 'Nature morte', labelEn: 'Still life' },
  { value: 'portrait', label: 'Portrait', labelEn: 'Portrait' },
] as const;

type ThemeValue = (typeof THEMES)[number]['value'];

/* ------------------------------------------------------------------ */
/* Thèmes                                                              */
/* ------------------------------------------------------------------ */

/** Thème : titre + accroche + couverture, géré dans Keystatic (« Thèmes »). */
export type Theme = {
  slug: string;
  title: string;
  tagline: string | null;
  cover: string | null;
  intro: string | null;
  /** « Ordre d'affichage » saisi dans Keystatic (null = non numéroté). */
  order: number | null;
  /** Faux = thème masqué (et toutes ses œuvres) sur le site public. */
  visible: boolean;
};

/**
 * Couvertures historiques : dernier repli quand le thème n'a ni image
 * téléversée ni œuvre cochée « Couverture du thème ».
 */
const FALLBACK_COVERS: Record<string, string> = {
  'espaces-habites': '/images/works/espaces-habites/paradise-en-cours/paradise-en-cours.webp',
  bath: '/images/works/bath/bains/bains.webp',
  flashback: '/images/works/flashback/autoroute/autoroute.webp',
  nature: '/images/works/nature/foret/foret.webp',
  'nature-morte': '/images/works/nature-morte/breakfast-2/breakfast-2.webp',
  portrait: '/images/works/portrait/em-portrait/em-portrait.webp',
};

/**
 * « Ordre d'affichage » saisi dans Keystatic : un numéro de position, ou rien.
 * Tout ce qui n'est pas un nombre exploitable (champ vide, ancien YAML) = non ordonné.
 */
function orderOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Comparateur d'ordre éditorial : les entrées numérotées passent d'abord,
 * dans l'ordre croissant ; les autres sont renvoyées à la fin (null = « pas
 * d'avis », le tri enchaîne alors sur l'ordre par défaut de la liste).
 */
function byEditorialOrder(a: { order: number | null }, b: { order: number | null }): number | null {
  if (a.order === null && b.order === null) return null;
  if (a.order === null) return 1;
  if (b.order === null) return -1;
  return a.order - b.order || null;
}

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

  const themes = slugs.map((slug) => {
    const entry = (bySlug.get(slug) ?? {}) as {
      title?: string;
      titleEn?: string | null;
      tagline?: string | null;
      taglineEn?: string | null;
      cover?: string | null;
      intro?: string | null;
      introEn?: string | null;
      order?: number | null;
      visible?: boolean | null;
    };
    const historic = THEMES.find((theme) => theme.value === slug);
    return {
      slug,
      title:
        pick(locale, entry.title ?? historic?.label, entry.titleEn ?? historic?.labelEn) ??
        historic?.label ??
        slug,
      tagline: pick(locale, entry.tagline, entry.taglineEn),
      cover: filled(entry.cover) ?? FALLBACK_COVERS[slug] ?? null,
      intro: pick(locale, entry.intro, entry.introEn),
      /* Champ « Ordre d'affichage » du CMS : vide = après les numérotés. */
      order: orderOf(entry.order),
      /* Absent du YAML (avant la case « Afficher ») = visible. */
      visible: entry.visible !== false,
    };
  });

  /* Ordre manuel du CMS d'abord, ordre historique ensuite (tri stable). */
  const ordered = [...themes].sort((a, b) => byEditorialOrder(a, b) ?? 0);

  /* Thème masqué : retiré du site public (listes + pages + œuvres). */
  return ordered.filter((theme) => theme.visible);
}

/**
 * Couverture d'un thème depuis le CMS :
 * 1. image de couverture téléversée,
 * 2. sinon image de l'œuvre cochée « Couverture du thème »,
 * 3. sinon image de la première œuvre du thème,
 * 4. sinon visuel historique.
 */
export async function themeCover(
  theme: { slug: string; cover: string | null },
  works?: Work[]
): Promise<string | null> {
  if (theme.cover) return theme.cover;
  const all = works ?? (await getWorks());
  const ofTheme = all.filter((work) => work.theme === theme.slug && work.image);
  return (
    ofTheme.find((work) => work.isThemeCover)?.image ??
    ofTheme[0]?.image ??
    FALLBACK_COVERS[theme.slug] ??
    null
  );
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
  /** Thème de l'œuvre : le dossier (et donc la collection) où elle est rangée. */
  theme: string;
  image: string;
  gallery: string[];
  year: string | null;
  dimensions: string | null;
  technique: string | null;
  description: string | null;
  featured: boolean;
  /** Vrai = œuvre choisie pour couvrir la carte de son thème sur /oeuvres. */
  isThemeCover: boolean;
  /** « Ordre d'affichage » saisi dans Keystatic (null = non numérotée). */
  order: number | null;
  /** Faux = œuvre masquée sur le site public (case « Afficher » du CMS). */
  visible: boolean;
};

export type Settings = {
  siteName: string;
  tagline: string;
  /** Titre affiché dans l'onglet et dans Google (singleton « Paramètres SEO »). */
  seoTitle: string;
  metaDescription: string;
  shareImage: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  socials: { label: string; url: string }[];
  footerNote: string | null;
  copyright: string;
};

/** Référencement global, géré dans le singleton Keystatic « Paramètres SEO ». */
export type Seo = {
  siteTitle: string;
  metaDescription: string;
  shareImage: string | null;
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
  /** « Position d'affichage » saisie dans Keystatic (null = non numérotée). */
  order: number | null;
  cover: string;
  gallery: string[];
  description: string | null;
  link: string | null;
};

const EXPOSITION_TYPES: Record<Exposition['type'], string> = {
  personnelle: 'Exposition personnelle',
  collective: 'Exposition collective',
  concours: 'Salon, concours, prix',
  accrochage: 'Vues d’accrochage',
};

const EXPOSITION_TYPES_EN: Record<Exposition['type'], string> = {
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
  heroSlides: HeroSlideRef[];
  heroVideoUrl: string | null;
  heroCaption: string | null;
  introTitle: string | null;
  introText: string | null;
  selection: HeroSlideRef[];
  worksLinkLabel: string;
};

/**
 * Référence à une œuvre saisie dans Keystatic (carrousel et sélection de la
 * page d’accueil) : « thème/slug » dans le CMS. Le site résout ensuite chaque
 * référence vers la fiche réelle (titre, image, URL).
 */
export type HeroSlideRef = {
  /** Dossier du thème ; chaîne vide = ancien format « slug seul ». */
  theme: string;
  slug: string;
};

export type About = {
  title: string;
  portrait: string | null;
  portraitCaption: string | null;
  bioVideoMp4: string | null;
  bioVideoWebm: string | null;
  bioVideoPoster: string | null;
  bioVideoCaption: string | null;
  /** Crédit de réalisation affiché sous la vidéo (texte + lien cliquable). */
  videoCredit: string | null;
  videoCreditUrl: string | null;
  bio: string;
  quote: string | null;
  cvTitle: string;
  exhibitions: string[];
  awards: string[];
  training: string[];
  experience: string[];
  contactIntro: string | null;
  /** Documents téléchargeables (PDF) — affichés avant le bloc contact. */
  portfolioPdf: string | null;
  cvPdf: string | null;
};

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Valeurs de repli si un fichier de contenu est absent                */
/* ------------------------------------------------------------------ */

/** Mention de bas de page utilisée quand l'artiste laisse le champ vide. */
const FALLBACK_FOOTER_NOTE = 'Toutes les œuvres sont protégées par le droit d’auteur.';

const FALLBACK_SETTINGS: Settings = {
  siteName: 'Yann Jaime',
  tagline: 'Peintre',
  seoTitle: 'Yann Jaime — Peintre',
  metaDescription: '',
  shareImage: null,
  email: 'sepulveda_yann@yahoo.fr',
  phone: null,
  location: 'Paris — Lausanne',
  socials: [],
  footerNote: FALLBACK_FOOTER_NOTE,
  copyright: '© Yann Jaime',
};

/** Replis anglais des textes globaux (utilisés si le champ CMS est vide). */
const FALLBACK_EN = {
  tagline: 'Painter',
  metaDescription:
    'Portfolio of Yann Jaime, Swiss-Chilean painter: paintings of architecture, interiors and figures, and the Tours Nuages series.',
  footerNote: 'All works are protected by copyright.',
};

/** Replis du référencement, si « Paramètres SEO » n'est pas encore rempli. */
const FALLBACK_SEO = {
  siteTitle: 'Yann Jaime — Peintre',
  metaDescription:
    'Portfolio de Yann Jaime, peintre suisse-chilien : peintures d’architectures, d’intérieurs et de figures, série Tours Nuages.',
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
/* Textes alternatifs                                                  */
/* ------------------------------------------------------------------ */

/** Texte alternatif d'une œuvre : son titre et son année (saisis dans Keystatic). */
export function workAlt(work: Pick<Work, 'title' | 'year'>): string {
  return work.year ? `${work.title}, ${work.year}` : work.title;
}

/** Texte alternatif d'une carte de thème : son nom et sa phrase d'accroche. */
export function themeAlt(theme: Pick<Theme, 'title' | 'tagline'>): string {
  return theme.tagline ? `${theme.title} — ${theme.tagline}` : theme.title;
}

/* ------------------------------------------------------------------ */
/* Dimensions des images                                               */
/* ------------------------------------------------------------------ */

type ManifestEntry = { file?: string; width?: number; height?: number };

type ImageDimensions = { width: number; height: number };

/**
 * Dimensions réelles des images optimisées, lues dans les manifestes de
 * `npm run images:optimize`. Elles alimentent les attributs `width`/`height`
 * (pas de saut de mise en page — bon pour le référencement et l'affichage).
 *
 * Deux index : par chemin public exact, puis par nom de fichier. Le second
 * sert de repli quand l'image est référencée depuis un autre dossier que celui
 * du manifeste (fiches d'œuvres, couvertures, partage…), le nom de fichier
 * étant unique au sein d'une famille d'images.
 */
const IMAGE_SIZES: {
  byPath: Map<string, ImageDimensions>;
  byName: Map<string, ImageDimensions>;
} = (() => {
  const byPath = new Map<string, ImageDimensions>();
  const byName = new Map<string, ImageDimensions>();

  for (const name of ['images-manifest.json', 'expositions-manifest.json']) {
    const file = path.join(process.cwd(), 'src', 'data', name);
    if (!existsSync(file)) continue;
    try {
      const entries = JSON.parse(readFileSync(file, 'utf8')) as ManifestEntry[];
      for (const entry of entries) {
        if (!entry?.file || !entry.width || !entry.height) continue;
        const size = { width: entry.width, height: entry.height };
        byPath.set(entry.file, size);
        const basename = entry.file.split('/').pop();
        if (basename) byName.set(basename, size);
      }
    } catch {
      /* manifeste illisible : on retombe sur un ratio par défaut */
    }
  }

  return { byPath, byName };
})();

/** Dimensions d'une image (repli : ratio 4/3, jamais bloquant). */
export function imageSize(src: string | null | undefined): ImageDimensions {
  if (src) {
    const exact = IMAGE_SIZES.byPath.get(src);
    if (exact) return exact;
    const basename = src.split('/').pop();
    const byName = basename ? IMAGE_SIZES.byName.get(basename) : undefined;
    if (byName) return byName;
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

/* ------------------------------------------------------------------ */
/* Lecture des contenus                                                */
/* ------------------------------------------------------------------ */

/**
 * Référencement global (singleton « Paramètres SEO ») : titre affiché dans Google,
 * description d'accroche et image de partage, avec repli français/anglais.
 */
export async function getSeo(locale: Locale = 'fr'): Promise<Seo> {
  const entry = await reader.singletons.seo.read().catch(() => null);

  return {
    siteTitle: pick(locale, entry?.siteTitle, entry?.siteTitleEn) ?? FALLBACK_SEO.siteTitle,
    metaDescription:
      pick(locale, entry?.metaDescription, entry?.metaDescriptionEn) ??
      fallbackText(locale, FALLBACK_SEO.metaDescription, FALLBACK_EN.metaDescription),
    shareImage: filled(entry?.ogImage),
  };
}

/** Coordonnées et identité de l'artiste, avec les valeurs de référencement. */
export async function getSettings(locale: Locale = 'fr'): Promise<Settings> {
  const [entry, seo] = await Promise.all([
    reader.singletons.settings.read(),
    getSeo(locale),
  ]);

  return {
    siteName: filled(entry?.siteName) ?? FALLBACK_SETTINGS.siteName,
    tagline:
      pick(locale, entry?.tagline, entry?.taglineEn) ??
      fallbackText(locale, FALLBACK_SETTINGS.tagline, FALLBACK_EN.tagline),
    seoTitle: seo.siteTitle,
    metaDescription: seo.metaDescription,
    shareImage: seo.shareImage,
    email: filled(entry?.email) ?? FALLBACK_SETTINGS.email,
    phone: filled(entry?.phone),
    location: filled(entry?.location),
    socials: (entry?.socials ?? [])
      .filter((social) => Boolean(social?.label && social?.url))
      .map((social) => ({ label: social!.label.trim(), url: social!.url.trim() })),
    footerNote:
      pick(locale, entry?.footerNote, entry?.footerNoteEn) ??
      fallbackText(locale, FALLBACK_FOOTER_NOTE, FALLBACK_EN.footerNote),
    copyright: filled(entry?.copyright) ?? FALLBACK_SETTINGS.copyright,
  };
}

/** Contenu brut d'une fiche d'œuvre (YAML sans schéma Astro). */
type WorkYaml = {
  title?: string | null;
  titleEn?: string | null;
  image?: string | null;
  gallery?: (string | null)[] | null;
  year?: string | null;
  dimensions?: string | null;
  technique?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  featured?: boolean | null;
  isThemeCover?: boolean | null;
  order?: number | null;
  visible?: boolean | null;
};

/**
 * Toutes les œuvres, de la plus récente à la plus ancienne.
 *
 * Le thème d'une œuvre est donné par son dossier
 * (`src/content/works/<thème>/<œuvre>.yaml`, déclaré en glob dans
 * `src/content.config.ts`) : créer un thème dans Keystatic suffit pour que
 * ses œuvres soient lues ici, sans réglage supplémentaire.
 */
export async function getWorks(locale: Locale = 'fr'): Promise<Work[]> {
  const sortLocale = locale === 'en' ? 'en' : 'fr';

  /* Thème masqué : ses œuvres sont retirées du site en même temps que lui. */
  const hiddenThemes = new Set(
    (await reader.collections.themes.all())
      .filter(({ entry }) => entry.visible === false)
      .map(({ slug }) => slug)
  );

  const entries = await getCollection('works');

  return entries
    .map((entry): Work | null => {
      const segments = entry.id.split('/');
      const slug = segments[segments.length - 1];
      const theme = segments.slice(0, -1).join('/');
      if (theme.length === 0 || hiddenThemes.has(theme)) return null;

      const data = entry.data as WorkYaml;
      const work: Work = {
        slug,
        title: pick(locale, data.title, data.titleEn) ?? slug,
        theme,
        image: filled(data.image) ?? '',
        gallery: (data.gallery ?? []).filter((img): img is string => Boolean(img)),
        year: filled(data.year),
        dimensions: filled(data.dimensions),
        technique: filled(data.technique),
        description: pick(locale, data.description, data.descriptionEn),
        featured: Boolean(data.featured),
        isThemeCover: Boolean(data.isThemeCover),
        /* Champ « Ordre d'affichage » du CMS : vide = après les numérotées. */
        order: orderOf(data.order),
        /* Absent du YAML (avant la case « Afficher ») = visible. */
        visible: data.visible !== false,
      };
      return work.visible ? work : null;
    })
    .filter((work): work is Work => work !== null)
    .sort((a, b) => {
      /* 1. ordre manuel du CMS, 2. année la plus récente, 3. titre. */
      const editorial = byEditorialOrder(a, b);
      if (editorial !== null) return editorial;
      const yearA = Number(a.year ?? 0);
      const yearB = Number(b.year ?? 0);
      if (yearB !== yearA) return yearB - yearA;
      return a.title.localeCompare(b.title, sortLocale);
    });
}

/**
 * Lit une référence d'œuvre du CMS : « thème/slug » (format actuel), objet
 * `{ work }`, ancien objet `{ theme, slug }` ou slug seul — pour ne jamais
 * casser un contenu en attente de mise à jour.
 */
function parseWorkRef(value: unknown): HeroSlideRef | null {
  if (value && typeof value === 'object') {
    const item = value as { work?: unknown; theme?: unknown; slug?: unknown };
    if (typeof item.work === 'string') return splitWorkRef(item.work);
    const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
    const theme = typeof item.theme === 'string' ? item.theme.trim() : '';
    return slug ? { theme, slug } : null;
  }
  if (typeof value === 'string') return splitWorkRef(value);
  return null;
}

/** Découpe une clé « thème/slug » (sans slash = slug seul, thème inconnu). */
function splitWorkRef(value: string): HeroSlideRef | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const slash = trimmed.indexOf('/');
  if (slash === -1) return { theme: '', slug: trimmed };
  return { theme: trimmed.slice(0, slash), slug: trimmed.slice(slash + 1) };
}

export async function getHomepage(locale: Locale = 'fr'): Promise<Homepage> {
  const fallback: Homepage = {
    heroTitle: 'Yann Jaime',
    heroSubtitle: 'Portfolio 2021-2026',
    heroMediaType: 'image',
    heroImage: null,
    heroSlides: [],
    heroVideoUrl: null,
    heroCaption: null,
    introTitle: null,
    introText: null,
    selection: [],
    worksLinkLabel: fallbackText(locale, 'Voir toutes les œuvres', 'View all works'),
  };

  const entry = await reader.singletons.homepage.read();
  if (!entry) return fallback;

  /*
   * Carrousel et sélection : Keystatic enregistre des références « thème/slug »
   * (listes déroulantes). Les anciens formats (`{ theme, slug }`, slug seul)
   * restent lus pour ne jamais casser un contenu en attente de mise à jour.
   */
  const heroSlides = (Array.isArray(entry.heroSlides) ? entry.heroSlides : [])
    .map(parseWorkRef)
    .filter((ref): ref is HeroSlideRef => ref !== null);

  return {
    heroTitle: pick(locale, entry.heroTitle, entry.heroTitleEn) ?? fallback.heroTitle,
    heroSubtitle: pick(locale, entry.heroSubtitle, entry.heroSubtitleEn),
    heroMediaType: entry.heroMediaType === 'video' ? 'video' : 'image',
    heroImage: filled(entry.heroImage),
    heroSlides,
    heroVideoUrl: filled(entry.heroVideoUrl),
    heroCaption: pick(locale, entry.heroCaption, entry.heroCaptionEn),
    introTitle: pick(locale, entry.introTitle, entry.introTitleEn),
    introText: pick(locale, entry.introText, entry.introTextEn),
    selection: (Array.isArray(entry.selection) ? entry.selection : [])
      .map(parseWorkRef)
      .filter((ref): ref is HeroSlideRef => ref !== null),
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
    portfolioPdf: null,
    cvPdf: null,
    bioVideoMp4: null,
    bioVideoWebm: null,
    bioVideoPoster: null,
    bioVideoCaption: null,
    videoCredit: null,
    videoCreditUrl: null,
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
    videoCredit: filled(entry.videoCredit),
    videoCreditUrl: filled(entry.videoCreditUrl),
    bio: pick(locale, entry.bio, entry.bioEn) ?? '',
    quote: pick(locale, entry.quote, entry.quoteEn),
    cvTitle: pick(locale, entry.cvTitle, entry.cvTitleEn) ?? fallback.cvTitle,
    exhibitions: list(entry.exhibitions),
    awards: list(entry.awards),
    training: list(entry.training),
    experience: list(entry.experience),
    contactIntro: pick(locale, entry.contactIntro, entry.contactIntroEn),
    portfolioPdf: filled(entry.portfolioPdf),
    cvPdf: filled(entry.cvPdf),
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
      /* Champ « Position d'affichage » du CMS : vide = classement par année. */
      order: orderOf(entry.order),
      cover: filled(entry.cover) ?? '',
      gallery: (entry.gallery ?? []).filter((img): img is string => Boolean(img)),
      description: pick(locale, entry.description, entry.descriptionEn),
      link: filled(entry.link),
    }))
    .sort((a, b) => {
      /* 1. ordre manuel du CMS, 2. année la plus récente, 3. titre. */
      const editorial = byEditorialOrder(a, b);
      if (editorial !== null) return editorial;
      const yearA = Number(a.year ?? 0);
      const yearB = Number(b.year ?? 0);
      if (yearB !== yearA) return yearB - yearA;
      return a.title.localeCompare(b.title, sortLocale);
    });
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