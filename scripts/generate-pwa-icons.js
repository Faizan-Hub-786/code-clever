import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const sourceLogoPath = path.join(rootDir, 'public', 'assets', 'logo.jpeg');
const outputDir = path.join(rootDir, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating official CODE CLEVER PWA icons from:', sourceLogoPath);

  // 1. Standard 192x192 icon
  await sharp(sourceLogoPath)
    .resize(192, 192, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'code-clever-192.png'));
  console.log('✓ Created code-clever-192.png');

  // 2. Standard 512x512 icon
  await sharp(sourceLogoPath)
    .resize(512, 512, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'code-clever-512.png'));
  console.log('✓ Created code-clever-512.png');

  // 3. Maskable 512x512 icon (with 80% safe area padding on #05030D background to avoid clipping by Android circle/squircle masks)
  const innerLogoSize = Math.round(512 * 0.78); // ~400px inner size for 100% safe area
  const innerLogoBuffer = await sharp(sourceLogoPath)
    .resize(innerLogoSize, innerLogoSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 3, b: 13, alpha: 1 } // Brand #05030D background
    }
  })
    .composite([
      {
        input: innerLogoBuffer,
        gravity: 'center'
      }
    ])
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'code-clever-512-maskable.png'));
  console.log('✓ Created code-clever-512-maskable.png (Safe Zone Centered)');

  // 4. Apple Touch Icon 180x180
  await sharp(sourceLogoPath)
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'code-clever-180.png'));
  console.log('✓ Created code-clever-180.png (Apple Touch Icon)');

  // 5. Additional sizes for maximum browser & launcher compatibility
  const sizes = [48, 72, 96, 128, 144, 256, 384];
  for (const size of sizes) {
    await sharp(sourceLogoPath)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, `code-clever-${size}.png`));
    console.log(`✓ Created code-clever-${size}.png`);
  }

  // Also copy 192 icon as standard apple-touch-icon in public root if requested
  await sharp(sourceLogoPath)
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(path.join(rootDir, 'public', 'apple-touch-icon.png'));

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
