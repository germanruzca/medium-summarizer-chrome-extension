// Run with: node generate-icons.js
// Requires: npm install -g canvas (or: npx canvas)
// Alternatively uses the SVG approach below via sharp or just embed as data URIs

const fs = require('fs');
const path = require('path');

// Generate SVG icon content
function makeSvg(size) {
  const r = size * 0.12; // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7C3AED"/>
      <stop offset="100%" style="stop-color:#9333ea"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#grad)"/>
  <text
    x="50%" y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
    font-weight="800"
    font-size="${size * 0.52}px"
    fill="white"
    letter-spacing="-1"
  >M</text>
  <circle cx="${size * 0.72}" cy="${size * 0.28}" r="${size * 0.12}" fill="white" opacity="0.9"/>
  <text
    x="${size * 0.72}" y="${size * 0.295}"
    dominant-baseline="middle"
    text-anchor="middle"
    font-size="${size * 0.14}px"
    fill="#7C3AED"
  >✦</text>
</svg>`;
}

// Write SVG files (they work as icons in development)
[16, 48, 128].forEach(size => {
  const svg = makeSvg(size);
  const outPath = path.join(__dirname, `icon${size}.svg`);
  fs.writeFileSync(outPath, svg);
  console.log(`Written ${outPath}`);
});

console.log('\nSVG icons generated. For PNG conversion, install sharp:');
console.log('  npm install sharp');
console.log('  node convert-to-png.js');
