import path from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './util.js';

// __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getPreloadPath() {
  if (isDev()) {
    // load directly from your source folder
    return path.join(__dirname, 'preload.cjs');
  } else {
    // packaged as resources/app/dist/preload.cjs
    //return path.join(process.resourcesPath, 'dist', 'preload.cjs');
    return path.join(__dirname, 'preload.cjs');
  }
}