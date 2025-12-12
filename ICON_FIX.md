# Icon Fix for Windows

## Issue
The Windows icon has a white background around the blue rounded icon instead of being transparent.

## Root Cause
The ICO file may have been generated from a PNG that doesn't have proper alpha channel transparency in the corners outside the rounded rectangle.

## Fix Steps

### Option 1: Using Online Tools
1. Go to https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
2. Upload `build/icon.svg`
3. Ensure "Transparent background" is enabled
4. Download as 256x256 PNG
5. Replace `build/icon.png` with the new file
6. Go to https://convertio.co/png-ico/ or https://icoconvert.com/
7. Upload the new PNG
8. Generate ICO with sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
9. Replace `build/icon.ico` with the new file
10. Rebuild the app: `npm run build:win`

### Option 2: Using ImageMagick (if installed)
```bash
# Generate PNG with transparency
convert -background none build/icon.svg -resize 256x256 build/icon.png

# Generate ICO with multiple sizes
convert build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

### Option 3: Using Inkscape (if installed)
```bash
# Export SVG to PNG with transparency
inkscape build/icon.svg --export-type=png --export-filename=build/icon.png --export-width=256 --export-height=256 --export-background-opacity=0

# Then use online tool to convert PNG to ICO or use ImageMagick
```

## Verification
After regenerating:
1. Open `icon.png` in an image viewer - corners should be transparent (checkerboard pattern)
2. Open `icon.ico` in an icon editor - all sizes should have transparent corners
3. Rebuild the app and check the taskbar icon on Windows - should have no white background
