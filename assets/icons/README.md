# Icons

Chrome extensions require PNG icons for the action button. The SVG icon (`icon.svg`) is used in the UI, but PNG icons are needed for the extension icon.

## Generating PNG Icons

You can generate PNG icons from the SVG in several ways:

### Option 1: Using Sharp (Recommended)
```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

### Option 2: Using Online Tools
1. Open `icon.svg` in an image editor or online SVG to PNG converter
2. Export at sizes: 16x16, 48x48, 128x128 pixels
3. Save as `icon-16.png`, `icon-48.png`, `icon-128.png` in this directory

### Option 3: Using ImageMagick
```bash
convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 48x48 icon-48.png
convert icon.svg -resize 128x128 icon-128.png
```

### Option 4: Using HTML5 Canvas
Open `/tmp/create_simple_icon.html` in a browser to generate simple placeholder icons.

After generating the PNG files, update `manifest.json` to reference them:
```json
"action": {
  "default_icon": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

