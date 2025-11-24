// Simple script to generate PNG icons from SVG
// This requires a tool like sharp, canvas, or ImageMagick
// For now, this is a placeholder - you can use online tools or install sharp

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconSizes = [16, 48, 128];
const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const outputDir = path.join(__dirname, '../assets/icons');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not available. Please install it with: npm install sharp');
  console.log('Or use an online tool to convert SVG to PNG at sizes: 16x16, 48x48, 128x128');
  process.exit(1);
}

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG icon not found at:', svgPath);
    process.exit(1);
  }

  for (const size of iconSizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    } catch (error) {
      console.error(`Error generating ${size}x${size} icon:`, error);
    }
  }
}

generateIcons().catch(console.error);

