import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function createZip(sourceDir, outputPath) {
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory does not exist: ${sourceDir}`);
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  // Remove existing zip if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const outputName = path.basename(outputPath);
  const originalCwd = process.cwd();

  try {
    // Try using zip command (available on macOS/Linux)
    const sourceParent = path.dirname(sourceDir);
    const sourceName = path.basename(sourceDir);
    
    process.chdir(sourceParent);
    execSync(`zip -r "${outputPath}" "${sourceName}" -x "*.DS_Store" -x "__MACOSX/*"`, {
      stdio: 'inherit'
    });
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Created ${outputName} (${sizeInMB} MB)`);
  } catch (error) {
    // Fallback: try using archiver if zip command fails
    console.log('⚠️  zip command not available, trying archiver...');
    try {
      const archiver = (await import('archiver')).default;
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
          console.log(`✅ Created ${outputName} (${sizeInMB} MB)`);
          resolve(undefined);
        });

        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
      });
    } catch (archiverError) {
      console.error('❌ Error creating zip. Please install archiver: npm install --save-dev archiver');
      throw error;
    }
  } finally {
    // Restore original working directory
    process.chdir(originalCwd);
  }
}

async function zipBuilds() {
  const distDir = path.join(rootDir, 'dist');
  const distFirefoxDir = path.join(rootDir, 'dist-firefox');
  const distZip = path.join(rootDir, 'switch-tab-chrome.zip');
  const distFirefoxZip = path.join(rootDir, 'switch-tab-firefox.zip');

  console.log('📦 Creating zip files...\n');

  try {
    // Zip Chrome build
    if (fs.existsSync(distDir)) {
      console.log('Creating Chrome extension zip...');
      await createZip(distDir, distZip);
    } else {
      console.warn('⚠️  dist directory does not exist. Run "npm run build" first.');
    }

    // Zip Firefox build
    if (fs.existsSync(distFirefoxDir)) {
      console.log('Creating Firefox extension zip...');
      await createZip(distFirefoxDir, distFirefoxZip);
    } else {
      console.warn('⚠️  dist-firefox directory does not exist. Run "npm run build:firefox" first.');
    }

    console.log('\n✅ All zip files created successfully!');
  } catch (error) {
    console.error('❌ Error creating zip files:', error.message);
    process.exit(1);
  }
}

zipBuilds();

