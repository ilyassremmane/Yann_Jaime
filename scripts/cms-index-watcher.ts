import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build-cms-index.js');

/**
 * Plugin Vite (dev uniquement) : quand un thème est créé, renommé ou
 * supprimé dans `src/content/themes/`, l'index est régénéré et le
 * navigateur recharge. Sans cela, la nouvelle collection
 * « Œuvres — … » n'apparaît dans /keystatic qu'après un redémarrage
 * manuel du serveur (le module `cms-index.json` reste en cache).
 */
export function cmsIndexWatcher(): Plugin {
  let timer: NodeJS.Timeout | null = null;

  const onThemeFile = (file: string, server: { ws: { send: (payload: unknown) => void } }) => {
    if (!file.includes(`${path.sep}content${path.sep}themes${path.sep}`)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' }).trim();
        if (!out.includes('0 œuvre') && !out.includes('0 theme')) {
          console.log(`${out} — rechargement.`);
          server.ws.send({ type: 'full-reload' });
        }
      } catch (error) {
        console.warn('Index CMS non régénéré :', (error as Error).message);
      }
    }, 400);
  };

  return {
    name: 'cms-index-watcher',
    apply: 'serve',
    configureServer(server) {
      server.watcher.on('add', (file) => onThemeFile(file, server));
      server.watcher.on('unlink', (file) => onThemeFile(file, server));
      server.watcher.on('change', (file) => onThemeFile(file, server));
    },
  };
}
