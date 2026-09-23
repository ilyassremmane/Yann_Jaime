#!/usr/bin/env node
/**
 * Point d'entrée à la racine du projet.
 *
 * Le script complet (parcours des thèmes, redimensionnement, compression WebP,
 * vignettes, manifeste) vit dans `scripts/optimize-images.js`.
 *
 * Deux façons identiques de le lancer :
 *   node optimize-images.js            # depuis la racine du projet
 *   npm run images:optimize            # via le script npm
 *
 * Options : `node optimize-images.js --src="/chemin/vers/les/themes" --width=1920`
 */
import './scripts/optimize-images.js';