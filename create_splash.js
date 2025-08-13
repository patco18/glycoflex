const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create a splash screen with the logo centered on a white background
async function createSplashScreen() {
  try {
    // Create a white background with the icon centered
    const width = 1242; // iPhone X width
    const height = 2688; // iPhone X height
    const logoSize = 400;

    // Load the logo SVG
    const logoBuffer = fs.readFileSync(path.join(__dirname, 'temp_icons', 'glycoflex_logo.svg'));
    
    // Create a white background
    const background = Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="white"/>
    </svg>`);
    
    // Convert the logo to PNG
    const logoPng = await sharp(logoBuffer)
      .resize(logoSize)
      .toBuffer();
    
    // Create the splash image by overlaying the logo on the background
    await sharp(background)
      .composite([
        {
          input: logoPng,
          gravity: 'center'
        }
      ])
      .png()
      .toFile(path.join(__dirname, 'assets', 'images', 'splash.png'));
      
    console.log('Splash screen created successfully!');
  } catch (error) {
    console.error('Error creating splash screen:', error);
  }
}

createSplashScreen();
