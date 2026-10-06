# Yann Jaime — Portfolio

Site portfolio de **Yann Jaime**, artiste plasticien suisse-chilien (peinture : architectures,
intérieurs, natures mortes, portraits — série *Tours Nuages*).

- **Astro 5** en Static Site Generation (SSG) — HTML pur, très rapide.
- **Tailwind CSS 3** + fond « grain de toile ».
- **Keystatic CMS** sur `/keystatic` : l’artiste gère seul ses œuvres, thèmes, expositions et pages.
- **Vue 3** pour les îlots interactifs : filtres par thème et visionneuse plein écran.
- Design mobile-first, menu `<details>` natif (aucun JS requis pour la navigation).

---

## Démarrage

```bash
npm install
npm run dev               # http://localhost:4321
```

L’administration est sur **http://localhost:4321/keystatic** (stockage `local` en développement :
les modifications sont écrites directement dans les fichiers du projet).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement + CMS local |
| `npm run build` | Build complet (pages statiques + interface Keystatic) |
| `npm run build:static` | Build 100 % statique, sans `/keystatic` (hébergement CDN) |
| `npm run preview` | Prévisualisation du build |
| `npm run check` | Vérification des types (`.astro`, `.ts`, `.vue`) |
| `npm run images:safety` | Optimise les photos téléversées (auto à `dev`/`build`) |
| `npm run content:index` | Régénère l’index du catalogue lu par le CMS (auto à `dev`/`build`) |
| `npm run content:cleanup` | Supprime les fiches et photos des thèmes supprimés (auto à `dev`/`build`) |

---

## Traitement des images

Keystatic **ne traite pas** les fichiers : il les écrit tels quels. C’est
`scripts/compress-uploads.js` qui s’en charge, sans aucune intervention de l’artiste
(au démarrage de `dev` et à chaque `build` Netlify ; à la demande avec `npm run images:safety`).
Il convertit en WebP les formats non affichables, génère la vignette (720 px) si absente,
compresse au-delà de 1,5 Mo ou 1920 px, et met à jour le manifeste
(`src/data/*-manifest.json`, dimensions pour `width`/`height`).
Pour ajouter une œuvre : créez sa fiche dans `/keystatic` et déposez-y la photo.

> Section détaillée (fonctionnement pas à pas) : « Compression automatique des photos
> téléversées » plus bas, dans le chapitre CMS.

---

## Le CMS — Keystatic (`/keystatic`)

L’artiste gère tout son site sans toucher au code :

| Contenu | Où | Champs |
| --- | --- | --- |
| **Collections « Œuvres »** (une par thème) | `src/content/works/<thème>/*.yaml` | Titre (slug auto), Image principale, Images secondaires, Année, Dimensions, Technique, Description (fr/en), Mise en avant, Couverture du thème, **Ordre d’affichage**, Visibilité |
| **Thèmes** | `src/content/themes/*.yaml` | Titre, accroche, image de couverture, texte de présentation, **Ordre d’affichage**, Visibilité |
| **Accueil** (singleton) | `src/content/homepage/index.yaml` | Titre et sous-titre du hero, **photo ou vidéo** principale, légende, texte d’introduction, sélection d’œuvres, libellé du lien |
| **Expositions** | `src/content/expositions/*.yaml` | Titre, type, lieu, ville, dates, année, **position d’affichage**, couverture, photos, description, lien |
| **À propos** (singleton) | `src/content/about/index.yaml` | Portrait, légende, biographie, citation, CV (expositions, prix, formations, expériences), vidéo + **mention de réalisation** |
| **Paramètres globaux** (singleton) | `src/content/settings/index.yaml` | Nom du site, accroche fr/en, e-mail, téléphone, lieu, réseaux sociaux, mention de bas de page, copyright |
| **Paramètres SEO** (singleton) | `src/content/seo/index.yaml` | Titre dans Google (fr/en), description d’accroche fr/en, image de partage |
**Classer les contenus à la main :** dans « Thèmes », « Œuvres — … » et « Expositions », le champ
**« Ordre d’affichage »** (ou **« Position d’affichage »** pour les expositions) accepte un numéro —
`1` = premier de la liste. Les éléments numérotés passent devant les autres, dans l’ordre choisi ;
laissez le champ vide pour conserver le classement automatique (thèmes : ordre historique, œuvres :
année la plus récente, expositions : année la plus récente).

> **Rangement des œuvres** : le thème est donné par le dossier de la fiche
> (`src/content/works/<thème>/<slug>.yaml`, une collection Keystatic par thème) et les
> images de l'œuvre vivent dans `public/images/works/<thème>/<slug>/`.
>
> **Créer ou supprimer un thème suffit** : `keystatic.config.ts` génère une
> collection « Œuvres — <thème> » et sa page publique pour chaque thème présent
> dans `src/content/themes/`. Supprimer un thème retire sa collection ; ses fiches
> et ses photos orphelines sont effacées au démarrage ou au build suivant par
> `npm run content:cleanup`.
>
> L'index `src/data/cms-index.json` (résumé slug/thème/titre) est régénéré à chaque
> `predev` et `prebuild` par `npm run content:index` ; il alimente les collections
> et les listes déroulantes de l'accueil sans ralentir le CMS. Après un ajout
> massif d'œuvres en local, relancer `npm run dev` suffit.

### Mode « local » (développement) — actif par défaut

`npm run dev` puis <http://localhost:4321/keystatic>. Les modifications sont écrites
directement dans les fichiers du projet (aucune variable d’environnement requise).

### Mode « github » (production)

1. Créer une GitHub App sur le dépôt du site (voir la documentation Keystatic « GitHub mode »).
2. Renseigner le dépôt dans `keystatic.config.ts` (constante `GITHUB_REPO`).
3. Copier `.env.example` en `.env` et remplir les 4 variables `KEYSTATIC_*`.
4. Builder en mode GitHub (`npm run build` hors dev utilise le stockage GitHub) :

```bash
npm run build
```

L’interface `/keystatic` permet alors de publier depuis un navigateur : chaque enregistrement
crée un commit, avec relecture possible avant publication. Une image sans vignette dans
`thumbs/` est affichée directement (repli géré par `thumbFor`), et sans entrée dans le
manifeste, son ratio est supposé 4/3 (`imageSize`).

### Compression automatique des photos téléversées

Keystatic **ne traite pas** les fichiers : il les écrit tels quels. C’est
`scripts/compress-uploads.js` qui s’en charge, sans aucune intervention de l’artiste
(« pré » de `dev` et `build` dans `package.json`, donc à chaque démarrage du serveur de
développement et à chaque build Netlify ; à la demande avec `npm run images:safety`). Il :

1. convertit en WebP les formats que les navigateurs ne savent pas afficher (tif, tiff…),
   renomme le fichier **et met à jour le YAML de la fiche** (`image:`, `gallery:`, `cover:`) ;
2. crée la vignette `thumbs/…` manquante (720 px) ;
3. ré-encode au-delà de **1,5 Mo ou 1920 px de large** — même nom, donc le YAML reste valable ;
4. rafraîchit `src/data/*-manifest.json` (dimensions des balises `<img>`).

Un fichier déjà conforme est ignoré : le build reste rapide et le contenu existant n’est pas
recompressé.

> En production, le stockage `local` n’est pas disponible (il nécessite le serveur de
> développement) : le mode GitHub prend le relais.

---

## Structure du projet

```
├── astro.config.mjs          # SSG + adapter Node (pour /keystatic) + integrations
├── keystatic.config.ts       # schémas du CMS (œuvres, thèmes, expositions, pages + SEO)
├── tailwind.config.mjs
├── scripts/
│   ├── build-cms-index.js    # index du catalogue lu par le CMS (auto à dev/build)
│   ├── compress-uploads.js   # photos téléversées : conversion, recompression, vignettes
│   ├── remove-orphan-works.js # fiches et photos des thèmes supprimés (auto à dev/build)
│   └── archive/              # scripts d’import initial, usage ponctuel uniquement
├── src/
│   ├── components/           # Header, Footer, ThemeCard, WorkCard, HeroCarousel.vue, SecondaryGallery.vue
│   ├── content/              # contenu éditable (works/, themes/, expositions/, homepage/, about/, settings/, seo/)
│   ├── data/                 # images-manifest.json, expositions-manifest.json
│   ├── layouts/BaseLayout.astro
│   ├── lib/content.ts        # lecture typée du contenu (reader Keystatic)
│   ├── lib/seo.ts            # données structurées schema.org (JSON-LD)
│   ├── lib/i18n.ts           # libellés d’interface FR / EN
│   ├── pages/                # index, oeuvres/, expositions/, a-propos, contact, 404 (+ /en/)
│   └── styles/global.css     # palette, fond « grain de toile », typographie
└── public/images/works/      # images optimisées (works/<thème>/<œuvre>/ + thumbs/…)
```

## Référencement

Deux sources, toutes deux éditables dans `/keystatic` :

- **Paramètres SEO** (singleton) : titre affiché dans Google, description d’accroche (fr/en)
  et image de partage par défaut.
- **Contenus** : le titre et l’année d’une œuvre, la phrase d’accroche d’un thème, la
  présentation d’une exposition alimentent les `<title>`, les balises `og:` et les
  attributs `alt` (accessibilité + images).

`src/layouts/BaseLayout.astro` expose les props `title`, `description`, `ogImage`,
`ogImageAlt`, `canonical`, `type`, `noindex` et `structuredData` ; chaque page y passe ses
propres valeurs (fiche d’œuvre, thème, exposition) avec repli sur le singleton SEO.

## Design

- **Fond « grain de toile »** : trame pointillée en `radial-gradient` répété sur le `body`,
  plus un voile de bruit SVG (`feTurbulence`) fixe et à faible opacité, placé *sous* le
  contenu (`.grain-overlay` / `.site-layer`) pour ne jamais nuire à la lisibilité.
- **Typographie** : Cormorant Garamond (titres, esprit catalogue) + Jost (textes, interlettrage large).
- **Mobile-first** : navigation en barre dès `md`, menu déroulant natif (`<details>`) en dessous ;
  grilles 1 → 2 → 3 colonnes ; filtres de thème en défilement horizontal sur petit écran ;
  visionneuse plein écran avec navigation clavier (`←`, `→`, `Échap`).
- **Accessibilité** : lien d’évitement, focus visible, `aria-current`, dialogues `aria-modal`,
  respect de `prefers-reduced-motion`.

## Déploiement

```bash
npm run build          # pages statiques + administration
npm run preview        # vérification locale du build
npm run build:static   # 100 % statique, sans /keystatic (CDN simple)
```

Avec `npm run build`, les pages publiques sont pré-générées ; seules `/keystatic` et
`/api/keystatic/*` sont rendues à la demande (adapter Node, mode `standalone`).
Pour un hébergement strictement statique (GitHub Pages, S3…), utilisez `npm run build:static`.

## À personnaliser

- `site` dans `astro.config.mjs` et `SITE_URL` dans `src/lib/seo.ts` (URL définitive, identiques).
- `GITHUB_REPO` dans `keystatic.config.ts` (dépôt utilisé par le mode GitHub).
- Le singleton « Paramètres SEO » (titre dans Google, description, image de partage).

