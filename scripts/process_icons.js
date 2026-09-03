import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const dir = 'public/assets/Home page icons';
const iconNames = [
  'invite_friends.png',
  'recharge.png',
  'withdraw.png',
  'wealth_fund.png',
  'daily_checkin.png',
  'news_center.png',
  'loan.png',
  'lucky_draw.png'
];

for (const name of iconNames) {
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) continue;

  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const { width, height } = png;

  // Step 1: Remove white/light background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];

      // Threshold: if r, g, b > 230
      if (r > 230 && g > 230 && b > 230) {
        const minVal = Math.min(r, g, b);
        if (minVal >= 248) {
          png.data[idx + 3] = 0;
        } else {
          const alphaFactor = (248 - minVal) / 18;
          png.data[idx + 3] = Math.round(png.data[idx + 3] * alphaFactor);
        }
      }
    }
  }

  // Step 2: Find bounding box
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const a = png.data[idx + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    minX = 0; maxX = width - 1; minY = 0; maxY = height - 1;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const targetSize = Math.max(cropW, cropH) + 12;

  // Step 3: Create square canvas and center the cropped object
  const outPng = new PNG({ width: targetSize, height: targetSize });
  outPng.data.fill(0);

  const startX = Math.round((targetSize - cropW) / 2);
  const startY = Math.round((targetSize - cropH) / 2);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (width * (minY + y) + (minX + x)) << 2;
      const dstIdx = (targetSize * (startY + y) + (startX + x)) << 2;

      outPng.data[dstIdx] = png.data[srcIdx];
      outPng.data[dstIdx + 1] = png.data[srcIdx + 1];
      outPng.data[dstIdx + 2] = png.data[srcIdx + 2];
      outPng.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  const outBuffer = PNG.sync.write(outPng);
  fs.writeFileSync(filePath, outBuffer);
  console.log(`Processed & cropped: ${name} -> ${targetSize}x${targetSize}`);
}

console.log('All 8 icons cropped and transparent.');
