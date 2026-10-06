/**
 * Données structurées (schema.org / JSON-LD) et repères de référencement.
 * ---------------------------------------------------------------------
 * Les URL sont toujours construites à partir de l'URL de production (`site`
 * dans astro.config.mjs), reprise par BaseLayout : un seul endroit à
 * modifier le jour où le domaine change.
 *
 * Types utilisés (vérifiés dans le vocabulaire schema.org) :
 *   Person          → l'artiste (schema.org ne définit pas de type « Artist »)
 *   WebSite         → le portfolio
 *   VisualArtwork   → une peinture, avec ImageObject, dimensions et technique
 *   ImageGallery / CollectionPage → les pages qui regroupent des images
 *   ExhibitionEvent → une exposition
 */
import type { Exposition, Settings, Work } from './content';
import { artworkSize, imageSize, themeLabel, thumbFor } from './content';
import type { Locale } from './i18n';

export type JsonLdNode = Record<string, unknown>;

export type Breadcrumb = { name: string; url: string };

export const ARTIST_ID = '/#artiste';
export const SITE_ID = '/#site';
export const WORKS_ID = '/oeuvres/#collection';
export const EXPOSITIONS_ID = '/expositions/#collection';

/** URL publique de production — doit rester identique à `site` dans astro.config.mjs. */
export const SITE_URL = 'https://www.yannjaime.com';

/** URL absolue à partir d'un chemin interne. */
const abs = (site: string, url: string) => new URL(url, site).toString();

/** Retire les valeurs vides d'un nœud JSON-LD. */
function compact(node: JsonLdNode): JsonLdNode {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

/* ------------------------------------------------------------------ */
/* Nœuds réutilisés                                                    */
/* ------------------------------------------------------------------ */

/** L'artiste. */
export function artist(settings: Settings, site: string): JsonLdNode {
  return compact({
    '@type': 'Person',
    '@id': abs(site, ARTIST_ID),
    name: settings.siteName,
    url: abs(site, '/'),
    jobTitle: settings.tagline,
    description: settings.metaDescription,
    email: `mailto:${settings.email}`,
    knowsAbout: ['Peinture', 'Art contemporain', 'Architecture', 'Série Tours Nuages'],
    sameAs: settings.socials.map((social) => social.url),
  });
}

/** Le portfolio, rattaché à l'artiste. */
export function website(settings: Settings, site: string, locale: Locale = 'fr'): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': abs(site, SITE_ID),
    url: abs(site, locale === 'en' ? '/en/' : '/'),
    name: settings.seoTitle,
    inLanguage: locale,
    author: { '@id': abs(site, ARTIST_ID) },
    copyrightHolder: { '@id': abs(site, ARTIST_ID) },
  };
}

/** Fil d'Ariane (Accueil › Œuvres › …). */
export function breadcrumbs(site: string, trail: Breadcrumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: abs(site, step.url),
    })),
  };
}

/** Image d'une œuvre, avec dimensions et légende. */
export function artworkImage(src: string, caption: string, site: string, id: string): JsonLdNode {
  const size = imageSize(src);
  return {
    '@type': 'ImageObject',
    '@id': id,
    contentUrl: abs(site, src),
    url: abs(site, src),
    thumbnailUrl: abs(site, thumbFor(src)),
    width: size.width,
    height: size.height,
    caption,
  };
}

/* ------------------------------------------------------------------ */
/* Œuvres                                                              */
/* ------------------------------------------------------------------ */

/** Une peinture : VisualArtwork + ses images. */
export function artwork(work: Work, site: string, url: string, locale: Locale = 'fr'): JsonLdNode {
  const size = artworkSize(work.dimensions);
  const label = `${work.title}${work.year ? `, ${work.year}` : ''}`;
  const themeLocale = locale;

  const images = [work.image, ...work.gallery]
    .filter((src): src is string => Boolean(src))
    .map((src, index) =>
      artworkImage(
        src,
        index === 0 ? label : `${label} — vue ${index + 1}`,
        site,
        `${url}#image-${index + 1}`
      )
    );

  return compact({
    '@type': 'VisualArtwork',
    '@id': `${url}#oeuvre`,
    name: work.title,
    url,
    artform: 'Peinture',
    ...(work.technique ? { artMedium: work.technique } : {}),
    ...(work.year ? { dateCreated: work.year } : {}),
    ...(size
      ? {
          width: { '@type': 'Distance', value: size.width, unitCode: 'CMT' },
          height: { '@type': 'Distance', value: size.height, unitCode: 'CMT' },
        }
      : {}),
    description: work.description,
    keywords: [themeLabel(work.theme, themeLocale), work.technique, work.year].filter(Boolean),
    creator: { '@id': abs(site, ARTIST_ID) },
    isPartOf: { '@id': abs(site, WORKS_ID) },
    image: images.length === 1 ? images[0] : images,
  });
}

/* ------------------------------------------------------------------ */
/* Pages de regroupement                                               */
/* ------------------------------------------------------------------ */

/**
 * Page qui regroupe des images (galerie d'œuvres, série, expositions)
 * avec la liste ordonnée de ses entrées.
 */
export function imageCollectionPage(options: {
  site: string;
  url: string;
  name: string;
  description: string;
  id: string;
  items: { url: string; name: string; image?: string }[];
  locale?: Locale;
}): JsonLdNode {
  const { site, url, name, description, id, items, locale = 'fr' } = options;
  return {
    '@type': ['CollectionPage', 'ImageGallery'],
    '@id': abs(site, id),
    url,
    name,
    description,
    inLanguage: locale,
    isPartOf: { '@id': abs(site, SITE_ID) },
    about: { '@id': abs(site, ARTIST_ID) },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) =>
        compact({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: abs(site, item.url),
          image: item.image ? abs(site, item.image) : undefined,
        })
      ),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Expositions                                                         */
/* ------------------------------------------------------------------ */

/** Une exposition : ExhibitionEvent (lieu, dates, photos d'accrochage). */
export function expositionEvent(
  exposition: Exposition,
  site: string,
  url: string,
  locale: Locale = 'fr'
): JsonLdNode {
  const place = [exposition.location, exposition.city].filter(Boolean).join(', ');
  const images = [exposition.cover, ...exposition.gallery]
    .filter((src): src is string => Boolean(src))
    .map((src, index) =>
      artworkImage(
        src,
        `${exposition.title}${index > 0 ? ` — vue ${index + 1}` : ''}`,
        site,
        `${url}#image-${index + 1}`
      )
    );

  return compact({
    '@type': 'ExhibitionEvent',
    '@id': `${url}#exposition`,
    name: exposition.title,
    url,
    inLanguage: locale,
    description: exposition.description,
    ...(exposition.year ? { startDate: exposition.year } : {}),
    ...(place
      ? { location: { '@type': 'Place', name: place, address: exposition.city ?? undefined } }
      : {}),
    ...(exposition.link ? { sameAs: exposition.link } : {}),
    contributor: { '@id': abs(site, ARTIST_ID) },
    image: images.length === 1 ? images[0] : images,
  });
}

/* ------------------------------------------------------------------ */
/* Sortie                                                              */
/* ------------------------------------------------------------------ */

/** Enveloppe JSON-LD prête à être injectée dans un <script>. */
export function graph(nodes: (JsonLdNode | null | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is JsonLdNode => Boolean(node)),
  });
}
