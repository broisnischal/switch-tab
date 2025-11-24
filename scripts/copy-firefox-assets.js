import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distFirefoxDir = path.join(rootDir, 'dist-firefox');
const distSrcDir = path.join(rootDir, 'dist', 'src');
const srcDir = path.join(rootDir, 'src');

// Ensure dist-firefox exists
if (!fs.existsSync(distFirefoxDir)) {
  fs.mkdirSync(distFirefoxDir, { recursive: true });
}

// Copy compiled JavaScript files from dist/src to dist-firefox/src
if (fs.existsSync(distSrcDir)) {
  const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      // Only copy .js files from dist/src
      if (src.endsWith('.js')) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
      }
    }
  };
  
  const distFirefoxSrcDir = path.join(distFirefoxDir, 'src');
  copyRecursiveSync(distSrcDir, distFirefoxSrcDir);
  console.log('✅ Copied compiled JavaScript files to dist-firefox/src');
}

// Copy HTML, CSS, and other assets from src to dist-firefox/src
if (fs.existsSync(srcDir)) {
  const copyAssetsRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyAssetsRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      // Copy HTML, CSS, and other non-JS files
      const ext = path.extname(src);
      if (['.html', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.json'].includes(ext)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
      }
    }
  };
  
  const distFirefoxSrcDir = path.join(distFirefoxDir, 'src');
  copyAssetsRecursiveSync(srcDir, distFirefoxSrcDir);
  console.log('✅ Copied HTML, CSS, and other assets to dist-firefox/src');
}

// Copy manifest.firefox.json to dist-firefox/manifest.json
const manifestFirefoxPath = path.join(rootDir, 'manifest.firefox.json');
const distFirefoxManifestPath = path.join(distFirefoxDir, 'manifest.json');
if (fs.existsSync(manifestFirefoxPath)) {
  fs.copyFileSync(manifestFirefoxPath, distFirefoxManifestPath);
  console.log('✅ Copied manifest to dist-firefox/manifest.json');
}

console.log('✅ Firefox assets copied successfully');

