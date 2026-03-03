const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ABILITIES_DIR = "./abilities"; // Folder containing base ability images
const ICONS_DIR = "./icons"; // Folder containing modifier icons
const OUTPUT_DIR = "./output"; // Folder where generated images are saved
const MODIFIERS_FILE = "./modifiers.json"; // JSON mapping abilities to modifiers

const CANVAS_SIZE = 48; // Final image size (square)
const ABILITY_SIZE = 36; // Size of main ability icon inside canvas

const OVERLAY_SIZE = 28; // Maximum width of modifier icon
const OVERLAY_PADDING = 2; // Distance of modifier from top-left corner

const OUTLINE_PROFILES = {
  black: {
    colour: { r: 0, g: 0, b: 0 }, // Outline colour
    thickness: 2, // Outline thickness radius
    blur: 3, // Outline blur strength
  },
  white: {
    colour: { r: 255, g: 255, b: 255 }, // Outline colour
    thickness: 1, // Outline thickness radius
    blur: 1, // Outline blur strength
  },
};

const WHITE_OUTLINE_MODIFIERS = new Set(["igneous"]); // Modifiers that use white outline

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const modifiers = JSON.parse(fs.readFileSync(MODIFIERS_FILE, "utf8"));

function findAbilityFile(baseName) {
  const png = path.join(ABILITIES_DIR, `${baseName}.png`);
  const webp = path.join(ABILITIES_DIR, `${baseName}.webp`);
  if (fs.existsSync(png)) return png;
  if (fs.existsSync(webp)) return webp;
  return null;
}

async function generate() {
  for (const base of Object.keys(modifiers)) {
    const basePath = findAbilityFile(base);
    if (!basePath) {
      console.warn(`⚠ Ability not found: ${base}`);
      continue;
    }

    for (const modifier of modifiers[base]) {
      const iconPath = path.join(ICONS_DIR, `${modifier}.png`);
      if (!fs.existsSync(iconPath)) {
        console.warn(`⚠ Modifier icon not found: ${modifier}`);
        continue;
      }

      const profile = WHITE_OUTLINE_MODIFIERS.has(modifier)
        ? OUTLINE_PROFILES.white
        : OUTLINE_PROFILES.black;

      const outlineColour = profile.colour;
      const outlineThickness = profile.thickness;
      const outlineBlur = profile.blur;

      const resizedAbility = await sharp(basePath)
        .resize(ABILITY_SIZE, ABILITY_SIZE, {
          fit: "cover",
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer();

      const abilityLeft = CANVAS_SIZE - ABILITY_SIZE;
      const abilityTop = CANVAS_SIZE - ABILITY_SIZE;

      const canvas = await sharp({
        create: {
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          {
            input: resizedAbility,
            top: abilityTop,
            left: abilityLeft,
          },
        ])
        .png()
        .toBuffer();

      const trimmed = await sharp(iconPath).trim().toBuffer();
      const trimmedMeta = await sharp(trimmed).metadata();

      const icon =
        OVERLAY_SIZE < trimmedMeta.width
          ? await sharp(trimmed)
              .resize({
                width: OVERLAY_SIZE,
                kernel: sharp.kernel.lanczos3,
              })
              .png()
              .toBuffer()
          : trimmed;

      const padding = OVERLAY_PADDING;

      const silhouette = await sharp(icon).tint(outlineColour).png().toBuffer();

      const outlineBase = await sharp({
        create: {
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer();

      const outlineLayers = [];

      for (let x = -outlineThickness; x <= outlineThickness; x++) {
        for (let y = -outlineThickness; y <= outlineThickness; y++) {
          if (x === 0 && y === 0) continue;
          if (Math.sqrt(x * x + y * y) <= outlineThickness) {
            outlineLayers.push({
              input: silhouette,
              top: padding + y,
              left: padding + x,
            });
          }
        }
      }

      const rawOutlineLayer = await sharp(outlineBase)
        .composite(outlineLayers)
        .png()
        .toBuffer();

      const outlineAlpha = await sharp(rawOutlineLayer)
        .extractChannel("alpha")
        .blur(outlineBlur)
        .toBuffer();

      const blurredOutlineLayer = await sharp({
        create: {
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          channels: 3,
          background: outlineColour,
        },
      })
        .joinChannel(outlineAlpha)
        .png()
        .toBuffer();

      const outputPath = path.join(OUTPUT_DIR, `${base}-${modifier}.png`);

      await sharp(canvas)
        .composite([
          { input: blurredOutlineLayer },
          {
            input: icon,
            top: padding,
            left: padding,
          },
        ])
        .png()
        .toFile(outputPath);

      console.log(`✔ ${base}-${modifier}.png`);
    }
  }
}

generate().catch(console.error);
