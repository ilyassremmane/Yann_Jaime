/**
 * Optimisation du logo de Yann Jaime.
 *
 * - Source : `/Users/remmane/Desktop/media/web/Yann_sources/logo.png`
 *   — PNG RGBA 1254×1254, lettrage jaune **déjà détouré** (fond transparent,
 *   ~93 % de pixels transparents). L'alpha d'origine est parfait : on le
 *   garde tel quel.
 * - Seule opération : boîte englobante du tracé → rognage des marges
 *   transparentes → redimensionnement → WebP.
 *   ⚠️ Ne surtout pas reconstruire un masque depuis la couleur (saturation,
 *   luminance…) : ça épaissit les traits et salit le lettrage.
 * - Version noire de l'en-tête : `filter: brightness(0)` en CSS.
 *
 * Usage : `node scripts/optimize-logo.mjs`
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = '/Users/remmane/Desktop/media/web/Yann_sources/logo.png';
const DEST = 'public/images/logo.webp';
const MAX_WIDTH = 640;
const MARGIN = 4;
/* Pixels minimum par ligne/colonne pour retenir une bordure (bruit isolé). */
const BBOX_MIN_PIXELS = 3;

await mkdir('public/images', { recursive: true });

const { data: rgba, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const C = info.channels;

/* Boîte englobante d'après l'alpha d'origine. */
const colSum = new Int32Array(W);
const rowSum = new Int32Array(H);
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    if (rgba[(y * W + x) * C + 3] > 128) {
      colSum[x] += 1;
      rowSum[y] += 1;
    }
  }
}

let top = H;
let bottom = -1;
let left = W;
let right = -1;
for (let x = 0; x < W; x += 1) {
  if (colSum[x] < BBOX_MIN_PIXELS) continue;
  if (x < left) left = x;
  if (x > right) right = x;
}
for (let y = 0; y < H; y += 1) {
  if (rowSum[y] < BBOX_MIN_PIXELS) continue;
  if (y < top) top = y;
  if (y > bottom) bottom = y;
}
if (bottom < 0 || right < 0) throw new Error('Aucun tracé détecté dans logo.png');

left = Math.max(0, left - MARGIN);
top = Math.max(0, top - MARGIN);
right = Math.min(W - 1, right + MARGIN);
bottom = Math.min(H - 1, bottom + MARGIN);

const width = right - left + 1;
const height = bottom - top + 1;

const targetWidth = Math.min(MAX_WIDTH, width);
const targetHeight = Math.round((height * targetWidth) / width);

const out = await sharp(SRC)
  .ensureAlpha()
  .extract({ left, top, width, height })
  .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(DEST);

console.log(
  `Logo : ${W}×${H} → recadré ${width}×${height} (x=${left}, y=${top}) → ` +
    `${out.width}×${out.height} px, ${Math.round(out.size / 1024)} Ko → ${DEST}`
);
