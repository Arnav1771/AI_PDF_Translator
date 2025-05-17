// Simple script to create basic icons
const fs = require('fs');
const path = require('path');

// Basic PNG data for a blue square icon (16x16)
const iconBase64 = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABUSURBVDiNY/z//z8DJYCJgUIw8AY0NjYyMjAwMPz//5+RkZGRgYmJieH///+MjIyMjK9fv2ZgYGBg+PTpEwPjqAGjBgw7AxgZGf8zMDAwMDIyMgAADD4GB4dDm3MAAAAASUVORK5CYII=`;

const sizes = [16, 32, 48, 128];

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// Save the icon in different sizes
sizes.forEach(size => {
    const iconData = Buffer.from(iconBase64, 'base64');
    fs.writeFileSync(path.join('icons', `icon${size}.png`), iconData);
    console.log(`Icon icon${size}.png created.`);
});
