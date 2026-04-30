# Hub Icons

## Current Icons

The app currently uses **SVG placeholder icons** with:
- Blue gradient background (#3b82f6 to #2563eb)
- White "H" letter
- Rounded corners (22.5% border radius)

## Icon Files

### Static SVG Icons (in /public)
- `icon-192x192.svg` - Used by PWA manifest for app icon
- `icon-512x512.svg` - Used by PWA manifest for larger displays
- `favicon.svg` - Browser tab icon (SVG format)

### Dynamic Next.js Icons (in /src/app)
- `icon.tsx` - Generates favicon.ico dynamically (32x32)
- `apple-icon.tsx` - Generates Apple touch icon dynamically (180x180)

## Regenerating Icons

To regenerate the SVG icons:
```bash
npm run generate:icons
```

## Customizing Icons

### Option 1: Update the Generation Script
Edit `scripts/generate-icons.js` to change:
- Colors
- Letter/logo
- Size
- Border radius

### Option 2: Replace with Custom Icons
Replace the SVG files in `/public` with your own designs:
- Keep the same filenames
- Maintain the specified dimensions
- Update `manifest.json` if changing format (SVG to PNG)

### Option 3: Use Next.js Dynamic Icons
Edit `src/app/icon.tsx` and `src/app/apple-icon.tsx` to customize:
- Background colors/gradients
- Text/logo
- Styling

## Production Recommendations

For production, consider:
1. **Professional Design**: Hire a designer or use a design tool
2. **PNG Format**: Some older browsers prefer PNG over SVG
3. **Multiple Sizes**: Provide various sizes for different contexts
4. **Favicon Package**: Use [Real Favicon Generator](https://realfavicongenerator.net/)
5. **Brand Consistency**: Match your brand colors and style

## Icon Sizes Reference

| File | Size | Purpose |
|------|------|---------|
| favicon.ico | 32x32 | Browser tab |
| icon-192x192 | 192x192 | PWA icon (small) |
| icon-512x512 | 512x512 | PWA icon (large) |
| apple-touch-icon | 180x180 | iOS home screen |
