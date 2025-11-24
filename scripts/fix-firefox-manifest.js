import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distFirefoxManifestPath = path.join(rootDir, 'dist-firefox', 'manifest.firefox.json');
const distFirefoxManifestJsonPath = path.join(rootDir, 'dist-firefox', 'manifest.json');

if (fs.existsSync(distFirefoxManifestPath)) {
  // Copy manifest.firefox.json to manifest.json
  fs.copyFileSync(distFirefoxManifestPath, distFirefoxManifestJsonPath);
  // Remove manifest.firefox.json
  fs.unlinkSync(distFirefoxManifestPath);
  console.log('✅ Fixed manifest.json in dist-firefox');
} else {
  console.warn('⚠️  manifest.firefox.json not found in dist-firefox');
}

