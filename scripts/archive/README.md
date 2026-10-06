# Scripts d’import initial (archivés)

Usage ponctuel uniquement — le quotidien passe par `/keystatic` + `compress-uploads.js`.

- `optimize-images.js` : import en masse d’un dossier source → WebP + vignettes + manifeste.
  `node scripts/archive/optimize-images.js --src="/chemin/vers/photos"`.
- `seed-content.mjs` : crée les fiches d’œuvres depuis le manifeste.
- `optimize-logo.mjs` : régénère `public/images/logo.webp` depuis le PNG source.
