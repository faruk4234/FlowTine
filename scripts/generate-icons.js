/**
 * Regenerates all icon assets under src/assets/images/ from app-icon.png.
 * Run: yarn icons  (or: node scripts/generate-icons.js)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const IMAGES = path.join(ROOT, "src/assets/images");
const SOURCE = path.join(IMAGES, "app-icon.png");

const ICON_SIZES = [48, 72, 96, 120, 144, 152, 180, 192, 512, 1024];

async function resize(outPath, size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  const iconDir = path.join(IMAGES, "icon");
  fs.mkdirSync(iconDir, { recursive: true });

  for (const size of ICON_SIZES) {
    const out = path.join(iconDir, `icon_${size}x${size}.png`);
    await resize(out, size);
    console.log(`  ${path.relative(ROOT, out)}`);
  }

  const singles = [
    { file: "icon.png", size: 1024 },
    { file: "splash-icon.png", size: 1024 },
    { file: "favicon.png", size: 48 },
  ];

  for (const { file, size } of singles) {
    const out = path.join(IMAGES, file);
    await resize(out, size);
    console.log(`  ${path.relative(ROOT, out)}`);
  }

  console.log("\nDone — all assets generated from app-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
