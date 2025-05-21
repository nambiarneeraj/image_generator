import express from 'express';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
cloudinary.config({
  cloud_name: 'di7awnua6',
  api_key: '775163825915348',
  api_secret: 'nr2JFH4xUGba7nIj9XYyDCv7H04'
});

app.use(express.json());

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
  console.log(`[INFO] Created output directory: ${OUTPUT_DIR}`);
} else {
  console.log(`[INFO] Output directory already exists: ${OUTPUT_DIR}`);
}

const fontFileName = 'ComingSoon-Regular.ttf';
const fontPath = path.join(__dirname, 'fonts', fontFileName);
const fontName = 'Coming Soon';

if (fs.existsSync(fontPath)) {
  try {
    fs.accessSync(fontPath, fs.constants.R_OK);
    console.log(`[INFO] Font file is readable: ${fontPath}`);
    registerFont(fontPath, {
      family: fontName,
      weight: 'normal',
      style: 'normal'
    });
    console.log(`[INFO] Font '${fontName}' registered successfully.`);
  } catch (fontErr) {
    console.error(`[ERROR] Font registration failed:`, fontErr);
    console.error(`[DEBUG] Font path: ${fontPath}`);
    console.error(`[DEBUG] Ensure the font file is not corrupted and is a valid TTF`);
  }
} else {
  console.error(`[ERROR] Font file NOT FOUND at: ${fontPath}`);
  console.error(`[DEBUG] Current working directory: ${process.cwd()}`);
  console.error(`[DEBUG] Font should be at: ${fontPath}`);
}

function drawMultilineText(ctx, text, x, y, lineHeight, maxWidth = null) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const originalFont = ctx.font;

  if (maxWidth) {
    const fontSize = calculateOptimalFontSize(ctx, text, maxWidth);
    ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`);
  }

  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = y - (totalHeight / 2);

  lines.forEach((line, i) => {
    ctx.fillText(line.trim(), x, startY + (i * lineHeight));
  });

  if (maxWidth) ctx.font = originalFont;
}

function calculateOptimalFontSize(ctx, text, maxWidth) {
  const originalSize = parseInt(ctx.font.match(/\d+/)[0]);
  let fontSize = originalSize;
  ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`);

  const lines = text.split('\n');
  const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');

  while (ctx.measureText(longestLine).width > maxWidth && fontSize > 10) {
    fontSize -= 2;
    ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`);
  }

  return fontSize;
}

app.post('/generate-image', async (req, res) => {
  console.log(`[INFO] Received request to /generate-image`);
  const { text = 'Coming Soon' } = req.body;
  console.log(`[INFO] Text to draw: "${text}"`);

  try {
    const imagePath = path.join(__dirname, 'templates', 'simon.jpeg');
    if (!fs.existsSync(imagePath)) {
      console.error(`[ERROR] Base image not found at: ${imagePath}`);
      return res.status(404).send('Base image not found');
    }

    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const boardX = 200;
    const boardY = 370;
    const boardWidth = 1100;
    const boardHeight = 2300;
    const centerX = boardX + boardWidth / 2;
    const centerY = boardY + boardHeight / 2;

    ctx.fillStyle = '#D32F2F';
    const testFont = `54px "${fontName}", "Comic Sans MS", "Arial", sans-serif`;
    ctx.font = testFont;

    if (ctx.measureText('Test Font').width === ctx.measureText('Test Font').width) {
      console.log(`[INFO] Custom font '${fontName}' is working`);
    } else {
      console.warn(`[WARNING] Custom font not working, falling back to system fonts`);
      ctx.font = '54px "Comic Sans MS", "Arial", sans-serif';
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawMultilineText(ctx, text, centerX, centerY - 15, 52, boardWidth - 60);

    const filename = `simon-text-${Date.now()}.png`;
const tempPath = path.join(OUTPUT_DIR, filename);
const buffer = canvas.toBuffer('image/png');

// Save temporarily
fs.writeFileSync(tempPath, buffer);

// Upload to Cloudinary
const uploadResult = await cloudinary.uploader.upload(tempPath, {
  folder: 'Simon_Images',  // Optional Cloudinary folder
  public_id: filename.replace('.png', ''), 
  resource_type: 'image'
});

// Optionally delete local file after upload
fs.unlinkSync(tempPath);

console.log(`[INFO] Image uploaded to Cloudinary: ${uploadResult.secure_url}`);

res.json({
  message: 'Image uploaded successfully',
  cloudinary_url: uploadResult.secure_url,
  public_id: uploadResult.public_id
});
  } catch (err) {
    console.error(`[ERROR] Image generation failed:`, err);
    res.status(500).send('Image generation failed');
  }
});

app.listen(PORT, () => {
  console.log(`[INFO] Server running on http://localhost:${PORT}`);
  console.log(`[INFO] POST your text to /generate-image to create images`);
});
