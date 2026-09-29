/**
 * Internationalisation du site (FR / EN).
 * -------------------------------------------------------------------------
 * - `locale` : `'fr'` (racine `/`) ou `'en'` (préfixe `/en/…`).
 * - `withLocale()` bascule un chemin interne d'une langue à l'autre :
 *   `withLocale('/oeuvres', 'en')` → `/en/oeuvres`.
 * - `ui` contient TOUS les libellés d'interface non éditoriaux (boutons,
 *   fil d'Ariane, titres de section…). Les textes éditoriaux (biographie,
 *   descriptions, titres d'œuvres…) viennent du CMS : voir `src/lib/content.ts`.
 * - Le typage `const en: typeof fr` garantit la parité des clés :
 *   `astro check` échoue si une traduction manque.
 */
export type Locale = 'fr' | 'en';

export const LOCALES: readonly Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';

/** Langue déduite du chemin : `/en/…` → `en`, sinon `fr`. */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';
}

/** Bascule un chemin vers la langue demandée (compatible avec/sans `/en`). */
export function withLocale(path: string, locale: Locale): string {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/';
  if (locale === 'fr') return stripped;
  return stripped === '/' ? '/en' : `/en${stripped}`;
}

const fr = {
  nav: {
    home: 'Accueil',
    works: 'Œuvres',
    expositions: 'Expositions',
    about: 'À propos',
    contact: 'Contact',
  },
  langSwitch: { label: 'Changer de langue' },
  skipLink: 'Aller au contenu principal',
  footer: { browse: 'Parcourir', contact: 'Contact', credits: 'Site réalisé par' },

  home: {
    selection: 'Sélection',
    readBio: 'Lire la biographie',
    bioBlurb:
      'Yann Jaime vit et travaille entre la Suisse et la France. Son travail associe architectures, intérieurs et figures dans une peinture précise et épurée.',
    heroPlaceholder: 'Image principale à définir dans le CMS',
    eyebrow: 'Peinture',
    videoLabel: 'Vidéo',
    workAlt: (title: string) => `Œuvre de ${title}`,
  },

  worksPage: {
    eyebrow: 'Portfolio',
    title: 'Œuvres',
    themesTitle: 'Thèmes',
    count: (n: number) => `${n} œuvre${n > 1 ? 's' : ''}`,
    themeCount: (n: number) => `${n} œuvre${n > 1 ? 's' : ''}`,
    viewTheme: 'Voir le thème →',
    backToThemes: '← Tous les thèmes',
    description: (n: number) =>
      `Œuvres de Yann Jaime — ${n} peintures : architectures, intérieurs, natures mortes et portraits.`,
    jsonLd: 'Œuvres — Yann Jaime',
  },

  explorer: {
    all: 'Tout',
    filtersAria: 'Filtrer les œuvres par thème',
    zoom: 'Agrandir',
    zoomAria: (title: string) => `Agrandir « ${title} »`,
    viewLarge: 'Voir en grand',
    keyboardHint: 'Flèches ← → : œuvre précédente / suivante',
    zoomHint: 'Cliquer sur l’image pour l’agrandir',
    shown: (shown: number, total: number) =>
      `${shown} œuvre${shown > 1 ? 's' : ''} sur ${total} affichée${shown > 1 ? 's' : ''}`,
    showMore: (n: number) => `Afficher ${n} œuvre${n > 1 ? 's' : ''} de plus`,
    empty: 'Aucune œuvre dans ce thème pour le moment.',
    close: 'Fermer',
    closeAria: 'Fermer la visionneuse',
    previous: '← Précédente',
    next: 'Suivante →',
    previousAria: 'Œuvre précédente',
    nextAria: 'Œuvre suivante',
    navPrev: 'Précédente',
    navNext: 'Suivante',
    cardLink: 'Voir la fiche de l’œuvre',
    viewerCaption: 'Voir la fiche de l’œuvre',
    comingSoon: 'Image à venir',
    techniqueLabel: 'Technique',
    dimensionsLabel: 'Dimensions',
    yearLabel: 'Année',
    imagesTitle: 'Vues complémentaires',
    imagesNavAria: 'Navigation entre les œuvres',
    breadcrumbAria: 'Fil d’Ariane',
    requestInfo: 'Demander des informations →',
    available: 'Disponible',
    privateCollection: 'Collection privée',
    seoFallback: (title: string, year: string | null, technique: string | null) =>
      `${title}${year ? ` (${year})` : ''} — ${technique ?? 'peinture'} de Yann Jaime.`,
    workAria: (title: string) => `Œuvre : ${title}`,
    viewAlt: (title: string, n: number) => `${title} — vue ${n}`,
    viewerAria: (title: string) => `${title} — fiche de l’œuvre`,
  },

  aboutPage: {
    eyebrow: 'L’artiste',
    exhibitions: 'Expositions',
    awards: 'Prix',
    training: 'Formations',
    experience: 'Expériences',
    contactMe: 'Me contacter →',
    contactIntroFallback:
      'Pour toute demande d’exposition, d’acquisition ou de presse, le contact direct est privilégié.',
    seoFallback: 'Biographie de Yann Jaime, peintre.',
    portraitAlt: (name: string) => `Portrait de ${name}`,
    videoLabel: 'Vidéo d’atelier',
    videoPlay: 'Lire la vidéo',
    seeExhibitions: 'Voir toutes les expositions →',
    downloadPortfolio: 'Télécharger le portfolio',
    downloadCv: 'Télécharger le CV',
  },

  contactPage: {
    eyebrow: 'Prendre contact',
    title: 'Contact',
    email: 'E-mail',
    phone: 'Téléphone',
    studio: 'Atelier',
    writeMessage: 'Écrire un message',
    socials: 'Réseaux',
    workHeading: 'Le travail',
    workText:
      'Ateliers, expositions et nouvelles œuvres sont annoncés au fil des publications. Le portfolio complet est disponible dans la section Œuvres.',
    browseWorks: 'Parcourir les œuvres →',
    introFallback:
      'Pour une demande d’exposition, une acquisition, un projet ou une question sur une œuvre, écrivez-moi directement.',
    subject: 'Contact — site Yann Jaime',
    description: (email: string, location: string | null) =>
      `Contacter Yann Jaime — ${email}${location ? `, ${location}` : ''}.`,
  },

  expoPage: {
    eyebrow: 'Parcours',
    title: 'Expositions',
    count: (n: number) => `${n} exposition${n > 1 ? 's' : ''}`,
    intro:
      'Vues d’accrochage et photographies prises lors des expositions de Yann Jaime. Les œuvres elles-mêmes sont présentées dans la section',
    introLink: 'Œuvres',
    introEnd: '.',
    empty: 'Aucune exposition publiée pour le moment.',
    comingSoon: 'Image à venir',
    description:
      'Expositions de Yann Jaime — vues d’accrochage, salons et concours : PassepARTout Gallery à Milan, Chelsea International Fine Art Competition à New York.',
    jsonLd: 'Expositions — Yann Jaime',
    visitSite: 'Voir le site de l’exposition →',
    viewsTitle: 'Vues de l’exposition',
    navAria: 'Navigation entre les expositions',
    breadcrumbAria: 'Fil d’Ariane',
    seoFallback: (title: string, meta: string) =>
      `${title}${meta ? ` — ${meta}` : ''} : exposition de Yann Jaime.`,
    viewAlt: (title: string, n: number) => `${title} — vue ${n}`,
    coverAlt: (title: string) => `${title} — vue d’exposition`,
    ogAlt: (title: string) => `${title} — vue d’exposition de Yann Jaime`,
  },

  notFound: {
    eyebrow: 'Erreur 404',
    title: 'Page introuvable',
    heading: 'Cette page n’existe pas — ou plus.',
    text: 'L’adresse demandée ne correspond à aucune page du portfolio. Vous pouvez reprendre la visite par les œuvres ou revenir à l’accueil.',
    worksLink: 'Voir les œuvres →',
    homeLink: 'Retour à l’accueil',
  },
};

const en: typeof fr = {
  nav: {
    home: 'Home',
    works: 'Works',
    expositions: 'Exhibitions',
    about: 'About',
    contact: 'Contact',
  },
  langSwitch: { label: 'Change language' },
  skipLink: 'Skip to main content',
  footer: { browse: 'Browse', contact: 'Contact', credits: 'Website crafted by' },

  home: {
    selection: 'Selection',
    readBio: 'Read the biography',
    bioBlurb:
      'Yann Jaime lives and works between Switzerland and France. His work brings together architecture, interiors and figures in a precise, pared-back painting.',
    heroPlaceholder: 'Main image to set in the CMS',
    eyebrow: 'Painting',
    videoLabel: 'Video',
    workAlt: (title: string) => `Work by ${title}`,
  },

  worksPage: {
    eyebrow: 'Portfolio',
    title: 'Works',
    themesTitle: 'Series',
    count: (n: number) => `${n} work${n > 1 ? 's' : ''}`,
    themeCount: (n: number) => `${n} work${n > 1 ? 's' : ''}`,
    viewTheme: 'View the series →',
    backToThemes: '← All series',
    description: (n: number) =>
      `Works by Yann Jaime — ${n} paintings: architecture, interiors, still lifes and portraits.`,
    jsonLd: 'Works — Yann Jaime',
  },

  explorer: {
    all: 'All',
    filtersAria: 'Filter works by theme',
    zoom: 'View larger',
    zoomAria: (title: string) => `View “${title}” larger`,
    viewLarge: 'View larger',
    keyboardHint: 'Arrow keys ← →: previous / next work',
    zoomHint: 'Click the image to enlarge',
    shown: (shown: number, total: number) => `${shown} of ${total} works shown`,
    showMore: (n: number) => `Show ${n} more work${n > 1 ? 's' : ''}`,
    empty: 'No works in this theme yet.',
    close: 'Close',
    closeAria: 'Close the viewer',
    previous: '← Previous',
    next: 'Next →',
    previousAria: 'Previous work',
    nextAria: 'Next work',
    navPrev: 'Previous',
    navNext: 'Next',
    cardLink: 'View the work’s page',
    viewerCaption: 'View the work’s page',
    comingSoon: 'Image coming soon',
    techniqueLabel: 'Technique',
    dimensionsLabel: 'Dimensions',
    yearLabel: 'Year',
    imagesTitle: 'Additional views',
    imagesNavAria: 'Navigate between works',
    breadcrumbAria: 'Breadcrumb',
    requestInfo: 'Request information →',
    available: 'Available',
    privateCollection: 'Private collection',
    seoFallback: (title: string, year: string | null, technique: string | null) =>
      `${title}${year ? ` (${year})` : ''} — ${technique ?? 'painting'} by Yann Jaime.`,
    workAria: (title: string) => `Work: ${title}`,
    viewAlt: (title: string, n: number) => `${title} — view ${n}`,
    viewerAria: (title: string) => `${title} — work details`,
  },

  aboutPage: {
    eyebrow: 'The artist',
    exhibitions: 'Exhibitions',
    awards: 'Awards',
    training: 'Education',
    experience: 'Experience',
    contactMe: 'Contact me →',
    contactIntroFallback:
      'For any exhibition, acquisition or press enquiry, please get in touch directly.',
    seoFallback: 'Biography of Yann Jaime, painter.',
    portraitAlt: (name: string) => `Portrait of ${name}`,
    videoLabel: 'Studio video',
    videoPlay: 'Play video',
    seeExhibitions: 'See all exhibitions →',
    downloadPortfolio: 'Download portfolio',
    downloadCv: 'Download CV',
  },

  contactPage: {
    eyebrow: 'Get in touch',
    title: 'Contact',
    email: 'Email',
    phone: 'Phone',
    studio: 'Studio',
    writeMessage: 'Write a message',
    socials: 'Social media',
    workHeading: 'The work',
    workText:
      'Studio news, exhibitions and new works are shared as they happen. The full portfolio is available in the Works section.',
    browseWorks: 'Browse the works →',
    introFallback:
      'For an exhibition, a purchase, a project or a question about a work, please write to me directly.',
    subject: 'Contact — Yann Jaime website',
    description: (email: string, location: string | null) =>
      `Contact Yann Jaime — ${email}${location ? `, ${location}` : ''}.`,
  },

  expoPage: {
    eyebrow: 'Background',
    title: 'Exhibitions',
    count: (n: number) => `${n} exhibition${n > 1 ? 's' : ''}`,
    intro:
      'Installation views and photographs taken at Yann Jaime’s exhibitions. The works themselves are presented in the',
    introLink: 'Works',
    introEnd: ' section.',
    empty: 'No exhibitions published yet.',
    comingSoon: 'Image coming soon',
    description:
      'Exhibitions by Yann Jaime — installation views, art fairs and competitions: PassepARTout Gallery in Milan, Chelsea International Fine Art Competition in New York.',
    jsonLd: 'Exhibitions — Yann Jaime',
    visitSite: 'Visit the exhibition website →',
    viewsTitle: 'Exhibition views',
    navAria: 'Navigate between exhibitions',
    breadcrumbAria: 'Breadcrumb',
    seoFallback: (title: string, meta: string) =>
      `${title}${meta ? ` — ${meta}` : ''}: exhibition by Yann Jaime.`,
    viewAlt: (title: string, n: number) => `${title} — view ${n}`,
    coverAlt: (title: string) => `${title} — exhibition view`,
    ogAlt: (title: string) => `${title} — exhibition view by Yann Jaime`,
  },

  notFound: {
    eyebrow: 'Error 404',
    title: 'Page not found',
    heading: 'This page does not exist — or no longer does.',
    text: 'The address you requested does not match any page of the portfolio. You can continue browsing the works or return to the home page.',
    worksLink: 'View the works →',
    homeLink: 'Back to the home page',
  },
};

/** Libellés d'interface par langue. */
export const ui = { fr, en };

