import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Thèmes (catégories) des œuvres.
 * Les entrées sont gérées dans la collection `themes` (Keystatic → « Thèmes ») :
 * titre, phrase d'accroche, image de couverture. Cette constante garde
 * les valeurs historiques pour valider/migrer les anciens contenus.
 * Ordre = ordre d'affichage sur la page /oeuvres.
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
const IMAGES_DIR = 'public/images/works';
const IMAGES_URL = '/images/works';
const ABOUT_DIR = 'public/images/about';
const ABOUT_URL = '/images/about';
const EXPO_DIR = 'public/images/expositions';
const EXPO_URL = '/images/expositions';
const THEME_COVERS_DIR = 'public/images/themes';
const THEME_COVERS_URL = '/images/themes';
const ABOUT_VIDEOS_DIR = 'public/videos/about';
const ABOUT_VIDEOS_URL = '/videos/about';

/**
 * Mode de stockage du contenu :
 *  - `local` (défaut) : écriture directe dans le dépôt, pour le développement.
 *  - `github` : édition en ligne depuis /keystatic, commits automatiques, pour la production.
 *
 * Activé au build avec une variable publique (lisible aussi par le navigateur) :
 *   PUBLIC_KEYSTATIC_STORAGE=github npm run build
 *
 * ⚠️ On utilise `import.meta.env` et non `process.env` : ce fichier est également
 * chargé dans le navigateur par l'interface d'administration, où `process` n'existe pas.
 */
const useGitHub = import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github';
const GITHUB_REPO = 'remmane/yann-jaime-portfolio';

export default config({
  storage: useGitHub
    ? { kind: 'github', repo: GITHUB_REPO as `${string}/${string}` }
    : { kind: 'local' },

  ui: {
    brand: { name: 'Yann Jaime — Portfolio' },
    navigation: {
      Portfolio: ['themes', 'works', 'expositions'],
      'Pages uniques': ['homepage', 'about', 'settings'],
    },
  },

  collections: {
    /* ---------------------------------------------------------------- */
    /* THÈMES (navigation façon carolinewalker.org)                     */
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
            label: 'Titre',
            description: 'Titre du thème affiché sur /oeuvres (ex. Gravure).',
            validation: { isRequired: true },
          },
        }),
        titleEn: fields.text({
          label: 'Titre (anglais)',
          description: 'Version anglaise du titre. Vide = on affiche le titre français.',
        }),
        tagline: fields.text({
          label: "Phrase d'accroche",
          description: 'Texte court affiché sous le titre du thème.',
          multiline: true,
        }),
        taglineEn: fields.text({
          label: "Phrase d'accroche (anglais)",
          multiline: true,
        }),
        cover: fields.image({
          label: 'Image de couverture',
          description: "Visuel de la carte du thème sur /oeuvres. Sinon la première œuvre du thème l'illustre.",
          directory: THEME_COVERS_DIR,
          publicPath: `${THEME_COVERS_URL}/`,
        }),
        coverWork: fields.relationship({
          label: '… ou œuvre de couverture',
          description: "Alternative : utilise l'image d'une œuvre existante comme couverture.",
          collection: 'works',
        }),
        intro: fields.text({
          label: 'Texte de présentation',
          description: 'Paragraphe affiché en haut de la page du thème (/oeuvres/…).',
          multiline: true,
        }),
        introEn: fields.text({
          label: 'Texte de présentation (anglais)',
          multiline: true,
        }),
      },
    }),

    /* ---------------------------------------------------------------- */
    /* ŒUVRES                                                           */
    /* ---------------------------------------------------------------- */
    works: collection({
      label: 'Œuvres',
      slugField: 'title',
      path: 'src/content/works/*',
      format: { data: 'yaml' },
      columns: ['title', 'theme', 'year'],
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: {
            label: 'Titre',
            description: 'Titre affiché de l’œuvre, dans sa langue d’origine.',
            validation: { isRequired: true },
          },
        }),
        titleEn: fields.text({
          label: 'Titre (anglais)',
          description: 'Version anglaise du titre. Vide = on affiche le titre français.',
        }),
        theme: fields.relationship({
          label: 'Thème',
          description: 'Thème de rattachement : détermine la sous-page du thème où apparaît l’œuvre.',
          collection: 'themes',
          validation: { isRequired: true },
        }),
        image: fields.image({
          label: 'Image principale',
          description: 'Visuel de référence de l’œuvre.',
          directory: IMAGES_DIR,
          publicPath: `${IMAGES_URL}/`,
          validation: { isRequired: true },
        }),
        gallery: fields.array(
          fields.image({
            label: 'Image',
            directory: IMAGES_DIR,
            publicPath: `${IMAGES_URL}/`,
          }),
          {
            label: 'Images secondaires',
            description: 'Détails, vues d’accrochage, étapes de travail…',
            itemLabel: (props) => props.value?.filename ?? 'Image secondaire',
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
          label: 'Description',
          description: 'Une ligne vide crée un nouveau paragraphe.',
          multiline: true,
        }),
        descriptionEn: fields.text({
          label: 'Description (anglais)',
          description: 'Version anglaise. Vide = on affiche la description française.',
          multiline: true,
        }),
        featured: fields.checkbox({
          label: 'Mettre en avant',
          description: 'Proposer l’œuvre dans la sélection éditoriale.',
          defaultValue: false,
        }),
        available: fields.checkbox({
          label: 'Disponible',
          defaultValue: true,
        }),
      },
    }),

    /* ---------------------------------------------------------------- */
    /* EXPOSITIONS                                                      */
    /* Photos d'accrochage et vues d'exposition — rattachées à un lieu  */
    /* et à des dates, jamais mélangées aux œuvres.                     */
    /* ---------------------------------------------------------------- */
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
          label: 'Titre de l’exposition (anglais)',
          description: 'Vide = on affiche le titre français.',
        }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Exposition personnelle', value: 'personnelle' },
            { label: 'Exposition collective', value: 'collective' },
            { label: 'Salon, concours, prix', value: 'concours' },
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
        year: fields.text({ label: 'Année', description: 'Ex. 2023' }),
        cover: fields.image({
          label: 'Photo de couverture',
          description: 'Visuel utilisé sur la page Expositions.',
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
            label: 'Photos de l’exposition',
            description: 'Vues d’accrochage, affiche, vernissage…',
            itemLabel: (props) => props.value?.filename ?? 'Photo',
          }
        ),
        description: fields.text({
          label: 'Présentation',
          description: 'Une ligne vide crée un nouveau paragraphe.',
          multiline: true,
        }),
        descriptionEn: fields.text({
          label: 'Présentation (anglais)',
          description: 'Vide = on affiche la présentation française.',
          multiline: true,
        }),
        link: fields.url({
          label: 'Lien externe',
          description: 'Article de presse, page de la galerie (facultatif).',
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
          label: 'Titre du hero',
          validation: { isRequired: true },
        }),
        heroTitleEn: fields.text({
          label: 'Titre du hero (anglais)',
          description: 'Vide = on affiche le titre français.',
        }),
        heroSubtitle: fields.text({ label: 'Sous-titre du hero' }),
        heroSubtitleEn: fields.text({ label: 'Sous-titre du hero (anglais)' }),
        heroMediaType: fields.select({
          label: 'Type de média principal',
          options: [
            { label: 'Photographie', value: 'image' },
            { label: 'Vidéo', value: 'video' },
          ],
          defaultValue: 'image',
        }),
        heroImage: fields.image({
          label: 'Photo principale',
          description: 'Image affichée en grand sur l’accueil.',
          directory: IMAGES_DIR,
          publicPath: `${IMAGES_URL}/`,
        }),
        heroVideoUrl: fields.text({
          label: 'Vidéo principale (URL ou fichier)',
          description:
            'Utilisée si « Vidéo » est sélectionnée ci-dessus : fichier déposé dans public/videos/… ou URL complète.',
        }),
        heroCaption: fields.text({
          label: 'Légende du média',
          description: 'Ex. « Paradise », série Tours Nuages — Nanterre, 2024.',
        }),
        heroCaptionEn: fields.text({ label: 'Légende du média (anglais)' }),
        introTitle: fields.text({ label: 'Titre d’introduction' }),
        introTitleEn: fields.text({ label: 'Titre d’introduction (anglais)' }),
        introText: fields.text({
          label: 'Texte d’introduction',
          multiline: true,
        }),
        introTextEn: fields.text({
          label: 'Texte d’introduction (anglais)',
          description: 'Vide = on affiche le texte français.',
          multiline: true,
        }),
        selection: fields.array(
          fields.relationship({ label: 'Œuvre', collection: 'works' }),
          {
            label: 'Sélection d’œuvres',
            description: 'Œuvres mises en avant sur l’accueil, dans l’ordre souhaité.',
            itemLabel: (props) => props.value ?? 'Œuvre',
          }
        ),
        worksLinkLabel: fields.text({
          label: 'Libellé du lien vers /oeuvres',
          defaultValue: 'Voir toutes les œuvres',
        }),
        worksLinkLabelEn: fields.text({
          label: 'Libellé du lien vers /oeuvres (anglais)',
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
          defaultValue: 'À propos',
          validation: { isRequired: true },
        }),
        titleEn: fields.text({
          label: 'Titre de la page (anglais)',
          defaultValue: 'About',
        }),
        portrait: fields.image({
          label: 'Image de l’artiste',
          directory: ABOUT_DIR,
          publicPath: `${ABOUT_URL}/`,
        }),
        portraitCaption: fields.text({ label: 'Légende de l’image' }),
        bioVideoMp4: fields.file({
          label: 'Vidéo — MP4 (H.264)',
          description:
            'Vidéo silencieuse lue en boucle sur la page À propos. Fichier compressé fourni (960 px, sans son).',
          directory: ABOUT_VIDEOS_DIR,
          publicPath: `${ABOUT_VIDEOS_URL}/`,
        }),
        bioVideoWebm: fields.file({
          label: 'Vidéo — WebM (VP9)',
          description: 'Version WebM, lue en priorité par les navigateurs qui la supportent.',
          directory: ABOUT_VIDEOS_DIR,
          publicPath: `${ABOUT_VIDEOS_URL}/`,
        }),
        bioVideoPoster: fields.image({
          label: 'Vidéo — image de prévisualisation',
          description: 'Image affichée avant le démarrage de la vidéo.',
          directory: ABOUT_DIR,
          publicPath: `${ABOUT_URL}/`,
        }),
        bioVideoCaption: fields.text({
          label: 'Vidéo — légende',
          description: 'Courte légende affichée sous la vidéo.',
        }),
        bio: fields.text({
          label: 'Biographie',
          description: 'Une ligne vide crée un nouveau paragraphe.',
          multiline: true,
          validation: { isRequired: true },
        }),
        bioEn: fields.text({
          label: 'Biographie (anglais)',
          description: 'Vide = on affiche la biographie française.',
          multiline: true,
        }),
        quote: fields.text({ label: 'Citation / phrase-clé' }),
        quoteEn: fields.text({ label: 'Citation / phrase-clé (anglais)' }),
        cvTitle: fields.text({
          label: 'Titre de la section CV',
          defaultValue: 'Repères',
        }),
        cvTitleEn: fields.text({
          label: 'Titre de la section CV (anglais)',
          defaultValue: 'Milestones',
        }),
        exhibitions: fields.array(fields.text({ label: 'Exposition' }), {
          label: 'Expositions',
          itemLabel: (props) => props.value ?? 'Exposition',
        }),
        awards: fields.array(fields.text({ label: 'Prix' }), {
          label: 'Prix',
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
        contactIntro: fields.text({
          label: 'Texte de contact (bas de page)',
          multiline: true,
        }),
        contactIntroEn: fields.text({
          label: 'Texte de contact (bas de page) — anglais',
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
          defaultValue: 'Yann Jaime',
          validation: { isRequired: true },
        }),
        tagline: fields.text({
          label: 'Accroche (français)',
          description: 'Titre de métier affiché dans l’en-tête, le pied de page et le SEO.',
          defaultValue: 'Peintre',
        }),
        taglineEn: fields.text({
          label: 'Accroche (anglais)',
          defaultValue: 'Painter',
        }),
        metaDescription: fields.text({
          label: 'Description SEO (français)',
          multiline: true,
        }),
        metaDescriptionEn: fields.text({
          label: 'Description SEO (anglais)',
          multiline: true,
        }),
        shareImage: fields.image({
          label: 'Image de partage (réseaux sociaux)',
          directory: IMAGES_DIR,
          publicPath: `${IMAGES_URL}/`,
        }),
        email: fields.text({
          label: 'E-mail',
          validation: { isRequired: true },
        }),
        phone: fields.text({ label: 'Téléphone' }),
        location: fields.text({
          label: 'Lieu',
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
            description: 'Affichés en pied de page, sur la page Contact et dans les données structurées.',
            itemLabel: (props) => props.fields.label.value ?? 'Réseau',
          }
        ),
        footerNote: fields.text({
          label: 'Mention de pied de page (français)',
          defaultValue: 'Toutes les œuvres sont protégées par le droit d’auteur.',
        }),
        footerNoteEn: fields.text({
          label: 'Mention de pied de page (anglais)',
          defaultValue: 'All works are protected by copyright.',
        }),
        copyright: fields.text({
          label: 'Copyright',
          defaultValue: '© Yann Jaime',
        }),
      },
    }),
  },
});
