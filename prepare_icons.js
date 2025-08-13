const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Convert the SVG to various PNG sizes
async function createIcons() {
  try {
    // Create app icon (1024x1024 is recommended for app stores)
    await sharp(path.join(__dirname, 'temp_icons', 'glycoflex_logo.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(__dirname, 'assets', 'images', 'icon.png'));
    
    // Create favicon (usually 32x32 for web)
    await sharp(path.join(__dirname, 'temp_icons', 'glycoflex_logo.svg'))
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, 'assets', 'images', 'favicon.png'));
    
    // Create Android adaptive icons
    // Foreground - the logo on a transparent background
    await sharp(path.join(__dirname, 'temp_icons', 'glycoflex_logo.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(__dirname, 'assets', 'images', 'adaptive-icon', 'foreground.png'));
    
    // Background - a solid turquoise color
    const background = Buffer.from(
      '<svg><rect width="1024" height="1024" fill="#1EB4B4"/></svg>'
    );
    await sharp(background)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(__dirname, 'assets', 'images', 'adaptive-icon', 'background.png'));
    
    console.log('Icons created successfully!');
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

createIcons();
