import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read the base manifest (Chrome version)
const chromeManifest = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8')
);

// Create Firefox manifest (Firefox MV3 uses "scripts" instead of "service_worker")
const firefoxManifest = JSON.parse(JSON.stringify(chromeManifest)); // Deep clone

// Firefox MV3 uses "scripts" array instead of "service_worker"
if (firefoxManifest.background && firefoxManifest.background.service_worker) {
  firefoxManifest.background = {
    scripts: [firefoxManifest.background.service_worker],
    type: firefoxManifest.background.type || 'module'
  };
}

// Write Firefox manifest to root (for reference)
const firefoxManifestPath = path.join(rootDir, 'manifest.firefox.json');
fs.writeFileSync(
  firefoxManifestPath,
  JSON.stringify(firefoxManifest, null, 2),
  'utf8'
);

console.log('✅ Generated manifest.firefox.json for Firefox');

// Also create a Chrome manifest in dist (for Chrome builds)
const chromeManifestPath = path.join(rootDir, 'dist', 'manifest.json');
if (!fs.existsSync(path.dirname(chromeManifestPath))) {
  fs.mkdirSync(path.dirname(chromeManifestPath), { recursive: true });
}
fs.writeFileSync(
  chromeManifestPath,
  JSON.stringify(chromeManifest, null, 2),
  'utf8'
);

console.log('✅ Generated dist/manifest.json for Chrome');

