/**
 * Generate PWA icons
 * This script creates simple placeholder icons for the PWA manifest
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.225}" fill="url(#grad)"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.6}" 
    font-weight="bold" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
  >H</text>
</svg>
`;

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icons
const sizes = [192, 512];
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`✓ Generated ${filename}`);
});

// Generate favicon SVG
const faviconSVG = createSVG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✓ Generated favicon.svg');

console.log('\n✅ Icon generation complete!');
console.log('📝 Note: These are placeholder SVG icons.');
console.log('   For production, consider using PNG icons generated from a design tool.');
