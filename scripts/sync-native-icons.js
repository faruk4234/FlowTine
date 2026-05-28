/**
 * Syncs native iOS/Android launcher icons from src/assets/images/app-icon.png.
 *
 * Run:
 *   npm run native-icons
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "src/assets/images/app-icon.png");

const IOS_APPICON_1024 = path.join(
  ROOT,
  "ios/Minify/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"
);

const ANDROID_RES = path.join(ROOT, "android/app/src/main/res");
const ANDROID_LAUNCHER_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

function ensureFileExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}`);
  }
}

async function writePng(outPath, size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(outPath);
}

async function writeWebp(outPath, size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "cover", position: "centre" })
    .webp({ quality: 92 })
    .toFile(outPath);
}

async function writeForegroundWebp(outPath, size) {
  // Android adaptive icon foregrounds are larger than launcher icons (e.g. 108 vs 48).
  // We keep transparency so `@color/iconBackground` shows through.
  await sharp(SOURCE)
    .resize(size, size, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92 })
    .toFile(outPath);
}

async function main() {
  ensureFileExists(SOURCE);
  ensureFileExists(IOS_APPICON_1024);

  console.log("Syncing iOS AppIcon...");
  await writePng(IOS_APPICON_1024, 1024);
  console.log(`  ${path.relative(ROOT, IOS_APPICON_1024)}`);

  console.log("Syncing Android launcher icons...");
  for (const [dir, base] of Object.entries(ANDROID_LAUNCHER_SIZES)) {
    const folder = path.join(ANDROID_RES, dir);
    const launcher = path.join(folder, "ic_launcher.webp");
    const round = path.join(folder, "ic_launcher_round.webp");
    const foreground = path.join(folder, "ic_launcher_foreground.webp");

    ensureFileExists(launcher);
    ensureFileExists(round);
    ensureFileExists(foreground);

    await writeWebp(launcher, base);
    await writeWebp(round, base);
    await writeForegroundWebp(foreground, Math.round(base * 2.25)); // 48 -> 108

    console.log(`  ${path.relative(ROOT, launcher)}`);
    console.log(`  ${path.relative(ROOT, round)}`);
    console.log(`  ${path.relative(ROOT, foreground)}`);
  }

  console.log("\nDone — native icons updated from app-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
