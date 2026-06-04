// Creates PNG icons using only Node.js built-ins + sharp (if available)
// Or falls back to writing minimal valid PNGs via Buffer

const fs = require('fs');
const path = require('path');

// Try to use sharp for proper SVG→PNG conversion
async function trySharp() {
  try {
    const sharp = require('sharp');

    for (const size of [16, 48, 128]) {
      const svgPath = path.join(__dirname, `icon${size}.svg`);
      if (!fs.existsSync(svgPath)) {
        console.log(`Missing ${svgPath}, skipping`);
        continue;
      }
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, `icon${size}.png`));
      console.log(`Created icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

// Minimal 1x1 purple PNG as fallback (valid PNG, just a placeholder)
function minimalPng(color = [124, 58, 237]) {
  // 1x1 pixel RGBA PNG in base64 for purple
  // Pre-computed valid 1x1 PNG bytes
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

async function main() {
  const ok = await trySharp();
  if (!ok) {
    console.log('sharp not available — writing placeholder PNGs');
    console.log('Install sharp with: npm install sharp');
    console.log('Then re-run: node create-png-icons.js');
    for (const size of [16, 48, 128]) {
      fs.writeFileSync(path.join(__dirname, `icon${size}.png`), minimalPng());
      console.log(`Wrote placeholder icon${size}.png`);
    }
  }
}

main().catch(console.error);
