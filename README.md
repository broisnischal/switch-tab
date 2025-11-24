# Switch Tab Extension

A modern browser extension for quickly switching between tabs. Supports both Chrome and Firefox.

## Features

- Quick tab switching with keyboard shortcut (Ctrl+Shift+K / Cmd+Shift+K)
- Search and filter tabs by title
- Keyboard navigation (↑ ↓ Enter)
- Modern UI inspired by shadcn UI
- Cross-browser support (Chrome & Firefox)
- Manifest V3 support
- TypeScript support
- Hot reload for development

## Building for Different Browsers

This extension supports both Chrome and Firefox. The main difference is in how background scripts are declared:

- **Chrome**: Uses `service_worker` in manifest.json
- **Firefox**: Uses `scripts` array in manifest.json

### Build Commands

- `npm run build` - Build for Chrome (outputs to `dist/`)
- `npm run build:firefox` - Build for Firefox (outputs to `dist-firefox/`)
- `npm run build:all` - Build for both browsers
- `npm run generate-manifests` - Generate browser-specific manifests

The build process automatically generates:
- `manifest.json` (Chrome) - Uses `service_worker`
- `manifest.firefox.json` (Firefox) - Uses `scripts` array

### Loading the Extension

**Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.firefox.json` from the `dist-firefox` folder

## Development

```bash
# Install dependencies
npm install

# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Watch mode with hot reload
npm run watch
```
