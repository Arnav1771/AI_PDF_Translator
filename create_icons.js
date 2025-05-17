// Simple script to create basic icons
const fs = require('fs');
const path = require('path');

// Basic PNG data for a blue square icon (16x16) - suitable for all sizes as a placeholder
const iconBase64 = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABUSURBVDiNY/z//z8DJYCJgUIw8AY0NjYyMjAwMPz//5+RkZGRgYmJieH///+MjIyMjK9fv2ZgYGBg+PTpEwPjqAGjBgw7AxgZGf8zMDAwMDIyMgAADD4GB4dDm3MAAAAASUVORK5CYII=`;

// Define the target directory for icons relative to the script location
const iconsDir = path.join(__dirname, 'icons');

// Sizes required by the manifest
const sizes = [16, 48, 128]; // Only generate the sizes needed

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
    console.log(`Created directory: ${iconsDir}`);
}

// Save the icon in different sizes
sizes.forEach(size => {
    const iconData = Buffer.from(iconBase64, 'base64');
    const iconPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(iconPath, iconData);
    console.log(`Icon ${path.basename(iconPath)} created at ${iconPath}.`);
});

console.log("Icon generation complete.");
