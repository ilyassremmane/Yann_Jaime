import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Thèmes historiques, dans leur ordre d'affichage d'origine.
 * La collection « Thèmes » du CMS les remplace au fur et à mesure : cette liste
 * sert de repli et de clé de migration pour les contenus antérieurs.
 */
export const THEMES = [
  { value: 'arch-fenetres-tours-nuages', label: 'Architectures · Fenêtres · Tours Nuages', labelEn: 'Architectures · Windows · Cloud Towers' },
  { value: 'bath', label: 'Bath', labelEn: 'Bath' },
  { value: 'grands-parents', label: 'Grands-parents', labelEn: 'Grandparents' },
  { value: 'nature', label: 'Nature', labelEn: 'Nature' },
  { value: 'nature-morte', label: 'Nature morte', labelEn: 'Still life' },
  { value: 'portrait', label: 'Portrait', labelEn: 'Portrait' },
] as const;

export type ThemeValue = (typeof THEMES)[number]['value'];

/** Dossiers publics des médias (un dossier par famille de contenus). */
const WORKS_DIR = 'public/images/works';
const WORKS_URL = '/images/works';
const HOME_DIR = 'public/images/home';
const HOME_URL = '/images/home';
const SHARE_DIR = 'public/images/share';
const SHARE_URL = '/images/share';
const ABOUT_DIR = 'public/images/about';
const ABOUT_URL = '/images/about';
const EXPO_DIR = 'public/images/expositions';
const EXPO_URL = '/images/expositions';
const THEME_COVERS_DIR = 'public/images/themes';
const THEME_COVERS_URL = '/images/themes';
const ABOUT_VIDEOS_DIR = 'public/videos/about';
const ABOUT_VIDEOS_URL = '/videos/about';

/* Documents téléchargeables (portfolio, CV) — page À propos */
const DOCS_DIR = 'public/documents/about';
const DOCS_URL = '/documents/about';

/**
 * Stockage du contenu : écriture directe dans les fichiers en développement,
 * commits GitHub (dépôt ci-dessous) dans les builds de production.
 *
 * `import.meta.env.DEV` est remplacé statiquement par Vite — `true` sur le serveur
 * de développement, `false` au build. On évite `process.env` : ce fichier est aussi
 * chargé dans le navigateur par l'administration, où `process` n'existe pas.
 */
const GITHUB_REPO = 'ilyassremmane/Yann_Jaime';

/**
 * Schéma commun aux six collections d'œuvres (une par thème).
 *
 * Le dossier d'images est propre au thème : l'administration Keystatic y ajoute
 * le nom de l'œuvre, soit `public/images/works/<thème>/<œuvre>/<fichier>`.
 * La couverture d'un thème est désignée depuis une œuvre (`isThemeCover`) : une
 * relation unique ne peut pas viser six collections à la fois.
 */
function worksSchema(theme: ThemeValue) {
  const directory = `${WORKS_DIR}/${theme}`;
  const publicPath = `${WORKS_URL}/${theme}/`;

  return {
    title: fields.slug({
      name: {
        label: 'Titre de l’œuvre',
        description:
          'Tel qu’il s’affiche sur le site, ex. « Paradise en cours ». Ce titre nomme aussi la fiche dans son dossier (accents et espaces convertis automatiquement).',
        validation: { isRequired: true },
      },
    }),
    titleEn: fields.text({
      label: 'Titre en anglais (facultatif)',
      description: 'Laissez vide pour afficher le titre français sur la version anglaise du site.',
    }),
    image: fields.image({
      label: 'Photo principale',
      description:
        'L’image de l’œuvre, affichée dans les listes et sur sa fiche. Déposez le fichier le plus net dont vous disposez : il est optimisé automatiquement.',
      directory,
      publicPath,
      validation: { isRequired: true },
    }),
    gallery: fields.array(
      fields.image({
        label: 'Photo',
        directory,
        publicPath,
      }),
      {
        label: 'Autres vues (facultatif)',
        description: 'Détails, vues de l’atelier, étapes de travail… Elles apparaissent sous la photo principale.',
        itemLabel: (props) => props.value?.filename ?? 'Photo',
      }
    ),
    year: fields.text({
      label: 'Année',
      description: 'Ex. 2024',
    }),
    dimensions: fields.text({
      label: 'Dimensions',
      description: 'Ex. 102 × 73 × 2,5 cm',
    }),
    technique: fields.text({
      label: 'Technique',
      description: 'Ex. Huile sur canevas',
    }),
    description: fields.text({
      label: 'Texte de présentation (facultatif)',
      description: 'Une ligne vide sépare deux paragraphes.',
      multiline: true,
    }),
    descriptionEn: fields.text({
      label: 'Texte de présentation en anglais (facultatif)',
      description: 'Laissez vide pour reprendre le texte français.',
      multiline: true,
    }),
    featured: fields.checkbox({
      label: 'Mettre en avant',
      description: 'Propose cette œuvre dans la sélection de la page d’accueil.',
      defaultValue: false,
    }),
    isThemeCover: fields.checkbox({
      label: 'Afficher en couverture de son thème',
      description:
        'Une seule œuvre par thème : elle illustre la carte du thème sur la page « Œuvres » si aucune image de couverture n’y est déposée.',
      defaultValue: false,
    }),
    order: fields.number({
      label: 'Position dans le thème (facultatif)',
      description:
        '1 = première œuvre du thème. Sans numéro, l’œuvre se place après les œuvres numérotées, de la plus récente à la plus ancienne.',
    }),
    visible: fields.checkbox({
      label: 'Afficher cette œuvre sur le site',
      description: 'Décochez pour retirer l’œuvre des pages publiques sans la supprimer.',
      defaultValue: true,
    }),
  };
}

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: GITHUB_REPO as `${string}/${string}` },

  ui: {
    brand: { name: 'Yann Jaime — Portfolio' },
    navigation: {
      'Œuvres': [
        'themes',
        'works-arch-fenetres-tours-nuages',
        'works-bath',
        'works-grands-parents',
        'works-nature',
        'works-nature-morte',
        'works-portrait',
        'expositions',
      ],
      'Pages fixes': ['homepage', 'about', 'settings', 'seo'],
    },
  },

  collections: {
    /* ---------------------------------------------------------------- */
    /* THÈMES                                                           */
    /* ---------------------------------------------------------------- */
    themes: collection({
      label: 'Thèmes',
      slugField: 'title',
      path: 'src/content/themes/*',
      format: { data: 'yaml' },
      columns: ['title'],
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: {
            label: 'Nom du thème',
            description:
              'Affiché sur la page « Œuvres », ex. « Natures mortes ». Ce nom sert aussi à ranger les fiches : accents et espaces convertis automatiquement.',
            validation: { isRequired: true },
          },
        }),
        titleEn: fields.text({
          label: 'Nom du thème en anglais (facultatif)',
          description: 'Laissez vide pour afficher le nom français sur la version anglaise du site.',
        }),
        tagline: fields.text({
          label: 'Phrase d’accroche (facultatif)',
          description: 'Petit texte affiché sous le nom du thème.',
          multiline: true,
        }),
        taglineEn: fields.text({
          label: 'Phrase d’accroche en anglais (facultatif)',
          multiline: true,
        }),
        cover: fields.image({
          label: 'Image de couverture (facultatif)',
          description:
            'Illustre la carte du thème sur la page « Œuvres ». Laissez vide pour utiliser l’œuvre cochée « Afficher en couverture de son thème ». Format paysage conseillé.',
          directory: THEME_COVERS_DIR,
          publicPath: `${THEME_COVERS_URL}/`,
        }),
        intro: fields.text({
          label: 'Texte de présentation (facultatif)',
          description:
            'Paragraphe affiché en haut de la page du thème. Une ligne vide sépare deux paragraphes.',
          multiline: true,
        }),
        introEn: fields.text({
          label: 'Texte de présentation en anglais (facultatif)',
          description: 'Laissez vide pour reprendre le texte français.',
          multiline: true,
        }),
        order: fields.number({
          label: 'Position sur la page « Œuvres » (facultatif)',
          description:
            '1 = première carte. Sans numéro, le thème se place après les thèmes numérotés.',
        }),
        visible: fields.checkbox({
          label: 'Afficher ce thème sur le site',
          description:
            'Décochez pour masquer le thème et toutes ses œuvres ; leurs adresses renvoient alors une page « introuvable ».',
          defaultValue: true,
        }),
      },
    }),

    /* ---------------------------------------------------------------- */
    /* ŒUVRES                                                           */
    /* ---------------------------------------------------------------- */
    /* Une collection par thème : Keystatic range les images d'une fiche dans le
       dossier de son thème, soit public/images/works/<thème>/<œuvre>/. */
    'works-arch-fenetres-tours-nuages': collection({
      label: 'Œuvres — Architectures',
      slugField: 'title',
      path: 'src/content/works/arch-fenetres-tours-nuages/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('arch-fenetres-tours-nuages'),
    }),
    'works-bath': collection({
      label: 'Œuvres — Bath',
      slugField: 'title',
      path: 'src/content/works/bath/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('bath'),
    }),
    'works-grands-parents': collection({
      label: 'Œuvres — Grands-parents',
      slugField: 'title',
      path: 'src/content/works/grands-parents/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('grands-parents'),
    }),
    'works-nature': collection({
      label: 'Œuvres — Nature',
      slugField: 'title',
      path: 'src/content/works/nature/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('nature'),
    }),
    'works-nature-morte': collection({
      label: 'Œuvres — Nature morte',
      slugField: 'title',
      path: 'src/content/works/nature-morte/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('nature-morte'),
    }),
    'works-portrait': collection({
      label: 'Œuvres — Portrait',
      slugField: 'title',
      path: 'src/content/works/portrait/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      entryLayout: 'content',
      schema: worksSchema('portrait'),
    }),

    /* ---------------------------------------------------------------- */
    /* EXPOSITIONS                                                      */
    /* ---------------------------------------------------------------- */
    /* Vues d'accrochage, rattachées à un lieu et à des dates — jamais
       mélangées aux œuvres. */
    expositions: collection({
      label: 'Expositions',
      slugField: 'title',
      path: 'src/content/expositions/*',
      format: { data: 'yaml' },
      columns: ['title', 'location', 'year'],
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: {
            label: 'Titre de l’exposition',
            description: 'Ex. « Espaces habités » ou PassepARTout Gallery.',
            validation: { isRequired: true },
          },
        }),
        titleEn: fields.text({
          label: 'Titre en anglais (facultatif)',
          description: 'Laissez vide pour afficher le titre français.',
        }),
        type: fields.select({
          label: 'Type de présentation',
          options: [
            { label: 'Exposition personnelle', value: 'personnelle' },
            { label: 'Exposition collective', value: 'collective' },
            { label: 'Salon, concours ou prix', value: 'concours' },
            { label: 'Vues d’accrochage', value: 'accrochage' },
          ],
          defaultValue: 'collective',
        }),
        location: fields.text({
          label: 'Lieu',
          description: 'Galerie, centre d’art, salon…',
        }),
        city: fields.text({ label: 'Ville' }),
        dates: fields.text({
          label: 'Dates',
          description: 'Ex. juin — septembre 2023',
        }),
        year: fields.text({
          label: 'Année',
          description: 'Sert à classer les expositions, de la plus récente à la plus ancienne.',
        }),
        cover: fields.image({
          label: 'Photo de couverture',
          description:
            'Image affichée sur la page « Expositions ». Format paysage conseillé.',
          directory: EXPO_DIR,
          publicPath: `${EXPO_URL}/`,
          validation: { isRequired: true },
        }),
        gallery: fields.array(
          fields.image({
            label: 'Photo',
            directory: EXPO_DIR,
            publicPath: `${EXPO_URL}/`,
          }),
          {
            label: 'Autres photos (facultatif)',
            description: 'Vues d’accrochage, affiche, vernissage…',
            itemLabel: (props) => props.value?.filename ?? 'Photo',
          }
        ),
        description: fields.text({
          label: 'Texte de présentation (facultatif)',
          description: 'Une ligne vide sépare deux paragraphes.',
          multiline: true,
        }),
        descriptionEn: fields.text({
          label: 'Texte de présentation en anglais (facultatif)',
          description: 'Laissez vide pour reprendre le texte français.',
          multiline: true,
        }),
        link: fields.url({
          label: 'Lien externe (facultatif)',
          description: 'Article de presse ou page de la galerie, adresse complète commençant par https://',
        }),
      },
    }),
  },

  singletons: {
    /* ---------------------------------------------------------------- */
    /* ACCUEIL                                                          */
    /* ---------------------------------------------------------------- */
    homepage: singleton({
      label: 'Accueil',
      path: 'src/content/homepage/index',
      format: { data: 'yaml' },
      schema: {
        heroTitle: fields.text({
          label: 'Titre affiché sur la grande image d’accueil',
          description: 'Ex. « Yann Jaime ».',
          validation: { isRequired: true },
        }),
        heroTitleEn: fields.text({
          label: 'Titre en anglais (facultatif)',
          description: 'Laissez vide pour afficher le titre français.',
        }),
        heroSubtitle: fields.text({
          label: 'Petite ligne au-dessus du titre (facultatif)',
          description: 'Ex. « Peinture ».',
        }),
        heroSubtitleEn: fields.text({
          label: 'Petite ligne au-dessus du titre, en anglais (facultatif)',
        }),
        heroMediaType: fields.select({
          label: 'Média affiché en haut de la page',
          options: [
            { label: 'Une suite de photos (carrousel)', value: 'image' },
            { label: 'Une vidéo', value: 'video' },
          ],
          defaultValue: 'image',
        }),
        heroImage: fields.image({
          label: 'Image de secours (facultatif)',
          description:
            'Utilisée seulement si le carrousel ci-dessous est vide : le haut de la page affiche normalement les œuvres du carrousel.',
          directory: HOME_DIR,
          publicPath: `${HOME_URL}/`,
        }),
        heroSlides: fields.array(
          fields.object({
            theme: fields.select({
              label: 'Thème de l’œuvre',
              description: 'Le dossier où se trouve la fiche (les thèmes sont listés dans « Thèmes »).',
              options: THEMES.map((theme) => ({ label: theme.label, value: theme.value })),
              defaultValue: THEMES[0].value,
            }),
            slug: fields.text({
              label: 'Nom court de la fiche',
              description:
                'Nom exact du fichier de la fiche, sans extension (ex. paradise-en-cours). Vous le trouvez en bas de la fiche de l’œuvre, dans Keystatic.',
              validation: { isRequired: true },
            }),
          }),
          {
            label: 'Œuvres du carrousel d’accueil',
            description:
              'Jusqu’à 5 œuvres, dans l’ordre d’apparition. Choisissez le thème, puis saisissez le nom court de la fiche.',
            itemLabel: (props) =>
              [props.fields.theme.value, props.fields.slug.value].filter(Boolean).join(' / ') ||
              'Œuvre',
            validation: { length: { max: 5 } },
          }
        ),
        heroVideoUrl: fields.text({
          label: 'Vidéo affichée en haut de la page (facultatif)',
          description:
            'Utilisée si vous choisissez « Une vidéo » ci-dessus : collez une adresse YouTube ou Vimeo, ou le chemin d’un fichier vidéo.',
        }),
        heroCaption: fields.text({
          label: 'Légende de l’image (facultatif)',
          description: 'Ex. « Paradise », série Tours Nuages — Nanterre, 2024.',
        }),
        heroCaptionEn: fields.text({
          label: 'Légende de l’image en anglais (facultatif)',
        }),
        introTitle: fields.text({
          label: 'Titre du texte d’introduction (facultatif)',
        }),
        introTitleEn: fields.text({
          label: 'Titre du texte d’introduction en anglais (facultatif)',
        }),
        introText: fields.text({
          label: 'Texte d’introduction (facultatif)',
          description: 'Une ligne vide sépare deux paragraphes.',
          multiline: true,
        }),
        introTextEn: fields.text({
          label: 'Texte d’introduction en anglais (facultatif)',
          description: 'Laissez vide pour reprendre le texte français.',
          multiline: true,
        }),
        selection: fields.array(fields.text({ label: 'Nom court de la fiche' }), {
          label: 'Sélection d’œuvres en bas de page',
          description:
            'Œuvres montrées en entier sous l’introduction, dans l’ordre souhaité. Saisissez le nom court de chaque fiche (ex. paradise-en-cours, teatime) : le thème est retrouvé automatiquement.',
          itemLabel: (props) => props.value ?? 'Œuvre',
        }),
        worksLinkLabel: fields.text({
          label: 'Texte du lien vers la page « Œuvres »',
          defaultValue: 'Voir toutes les œuvres',
        }),
        worksLinkLabelEn: fields.text({
          label: 'Texte du lien vers la page « Œuvres », en anglais',
          defaultValue: 'View all works',
        }),
      },
    }),
    /* ---------------------------------------------------------------- */
    /* À PROPOS                                                         */
    /* ---------------------------------------------------------------- */
    about: singleton({
      label: 'À propos',
      path: 'src/content/about/index',
      format: { data: 'yaml' },
      schema: {
        title: fields.text({
          label: 'Titre de la page',
          description: 'Affiché en haut de la page et comme titre dans Google.',
          defaultValue: 'À propos',
          validation: { isRequired: true },
        }),
        titleEn: fields.text({
          label: 'Titre de la page en anglais (facultatif)',
          defaultValue: 'About',
        }),
        portrait: fields.image({
          label: 'Photo de l’artiste (facultatif)',
          description: 'Format portrait conseillé.',
          directory: ABOUT_DIR,
          publicPath: `${ABOUT_URL}/`,
        }),
        portraitCaption: fields.text({
          label: 'Légende de la photo (facultatif)',
        }),
        bioVideoMp4: fields.file({
          label: 'Vidéo — fichier MP4 (H.264)',
          description:
            'Film lu en boucle sur la page À propos. Format accepté par tous les navigateurs : préférez un fichier léger (sans son, 960 px de large).',
          directory: ABOUT_VIDEOS_DIR,
          publicPath: `${ABOUT_VIDEOS_URL}/`,
        }),
        bioVideoWebm: fields.file({
          label: 'Vidéo — fichier WebM (VP9) (facultatif)',
          description: 'Même film dans une version plus légère, proposée d’abord aux navigateurs qui l’acceptent.',
          directory: ABOUT_VIDEOS_DIR,
          publicPath: `${ABOUT_VIDEOS_URL}/`,
        }),
        bioVideoPoster: fields.image({
          label: 'Vidéo — image d’attente (facultatif)',
          description: 'Image affichée avant le lancement de la vidéo.',
          directory: ABOUT_DIR,
          publicPath: `${ABOUT_URL}/`,
        }),
        bioVideoCaption: fields.text({
          label: 'Vidéo — légende (facultatif)',
          description: 'Courte légende affichée sous la vidéo.',
        }),
        bio: fields.text({
          label: 'Biographie',
          description: 'Une ligne vide sépare deux paragraphes.',
          multiline: true,
          validation: { isRequired: true },
        }),
        bioEn: fields.text({
          label: 'Biographie en anglais (facultatif)',
          description: 'Laissez vide pour reprendre la biographie française.',
          multiline: true,
        }),
        quote: fields.text({ label: 'Citation ou phrase-clé (facultatif)' }),
        quoteEn: fields.text({ label: 'Citation ou phrase-clé en anglais (facultatif)' }),
        cvTitle: fields.text({
          label: 'Titre de la partie parcours',
          defaultValue: 'Repères',
        }),
        cvTitleEn: fields.text({
          label: 'Titre de la partie parcours en anglais',
          defaultValue: 'Milestones',
        }),
        exhibitions: fields.array(fields.text({ label: 'Exposition' }), {
          label: 'Expositions',
          description: 'Une ligne par exposition, de la plus récente à la plus ancienne.',
          itemLabel: (props) => props.value ?? 'Exposition',
        }),
        awards: fields.array(fields.text({ label: 'Prix' }), {
          label: 'Prix et distinctions',
          itemLabel: (props) => props.value ?? 'Prix',
        }),
        training: fields.array(fields.text({ label: 'Formation' }), {
          label: 'Formations',
          itemLabel: (props) => props.value ?? 'Formation',
        }),
        experience: fields.array(fields.text({ label: 'Expérience' }), {
          label: 'Expériences professionnelles',
          itemLabel: (props) => props.value ?? 'Expérience',
        }),
        portfolioPdf: fields.file({
          label: 'Portfolio en PDF (facultatif)',
          description:
            'Ajoute un bouton « Télécharger le portfolio » au bas de la page À propos.',
          directory: DOCS_DIR,
          publicPath: `${DOCS_URL}/`,
        }),
        cvPdf: fields.file({
          label: 'CV en PDF (facultatif)',
          description: 'Ajoute un bouton « Télécharger le CV » au bas de la page À propos.',
          directory: DOCS_DIR,
          publicPath: `${DOCS_URL}/`,
        }),
        contactIntro: fields.text({
          label: 'Texte de contact, bas de page (facultatif)',
          description: 'Une ligne vide sépare deux paragraphes.',
          multiline: true,
        }),
        contactIntroEn: fields.text({
          label: 'Texte de contact en anglais (facultatif)',
          multiline: true,
        }),
      },
    }),

    /* ---------------------------------------------------------------- */
    /* PARAMÈTRES GLOBAUX                                               */
    /* ---------------------------------------------------------------- */
    settings: singleton({
      label: 'Paramètres globaux',
      path: 'src/content/settings/index',
      format: { data: 'yaml' },
      schema: {
        siteName: fields.text({
          label: 'Nom du site',
          description: 'Affiché dans le menu, le pied de page et les résultats de recherche.',
          defaultValue: 'Yann Jaime',
          validation: { isRequired: true },
        }),
        tagline: fields.text({
          label: 'Métier ou accroche (français)',
          description: 'Affiché sous le nom, ex. « Peintre ».',
          defaultValue: 'Peintre',
        }),
        taglineEn: fields.text({
          label: 'Métier ou accroche (anglais)',
          defaultValue: 'Painter',
        }),
        email: fields.text({
          label: 'Adresse e-mail',
          description: 'Utilisée par le lien de contact et par les moteurs de recherche.',
          validation: { isRequired: true },
        }),
        phone: fields.text({ label: 'Téléphone (facultatif)' }),
        location: fields.text({
          label: 'Lieu (facultatif)',
          description: 'Ex. Paris — Lausanne',
        }),
        socials: fields.array(
          fields.object({
            label: fields.text({
              label: 'Nom du réseau',
              validation: { isRequired: true },
            }),
            url: fields.url({
              label: 'Adresse',
              validation: { isRequired: true },
            }),
          }),
          {
            label: 'Réseaux sociaux',
            description: 'Ces liens apparaissent au bas de toutes les pages.',
            itemLabel: (props) => props.fields.label.value ?? 'Réseau',
          }
        ),
        footerNote: fields.text({
          label: 'Mention de bas de page (français)',
          defaultValue: 'Toutes les œuvres sont protégées par le droit d’auteur.',
        }),
        footerNoteEn: fields.text({
          label: 'Mention de bas de page (anglais)',
          defaultValue: 'All works are protected by copyright.',
        }),
        copyright: fields.text({
          label: 'Ligne de copyright',
          defaultValue: '© Yann Jaime',
        }),
      },
    }),

    /* ---------------------------------------------------------------- */
    /* RÉFÉRENCEMENT (SEO)                                              */
    /* ---------------------------------------------------------------- */
    seo: singleton({
      label: 'Paramètres SEO',
      path: 'src/content/seo/index',
      format: { data: 'yaml' },
      schema: {
        siteTitle: fields.text({
          label: 'Titre du site dans Google',
          description:
            'Titre affiché dans l’onglet du navigateur et en tête des résultats de recherche. Ex. « Yann Jaime — Peintre ».',
          defaultValue: 'Yann Jaime — Peintre',
          validation: { isRequired: true },
        }),
        siteTitleEn: fields.text({
          label: 'Titre du site dans Google, en anglais (facultatif)',
          description: 'Laissez vide pour reprendre le titre français.',
        }),
        metaDescription: fields.text({
          label: 'Description pour Google',
          description:
            'Deux phrases qui présentent votre travail (160 caractères environ). Google les affiche sous le titre.',
          multiline: true,
        }),
        metaDescriptionEn: fields.text({
          label: 'Description pour Google en anglais (facultatif)',
          description: 'Laissez vide pour reprendre la description française.',
          multiline: true,
        }),
        ogImage: fields.image({
          label: 'Image de partage',
          description:
            'Image affichée lorsqu’une page du site est partagée sur les réseaux sociaux ou dans une messagerie. Format paysage conseillé (1200 × 630 px).',
          directory: SHARE_DIR,
          publicPath: `${SHARE_URL}/`,
        }),
      },
    }),
  },
});
