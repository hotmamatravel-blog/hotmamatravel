import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const GRID_IMAGE = 'C:\\Users\\Thurmans\\.gemini\\antigravity-ide\\brain\\01968e0a-b09b-4dc4-804f-3da1b56e4bc2\\vegas_gold_icons_grid_1782186969899.png';
const OUTPUT_DIR = 'C:\\Users\\Thurmans\\.gemini\\antigravity-ide\\brain\\01968e0a-b09b-4dc4-804f-3da1b56e4bc2\\map_assets';

// Grid mappings: 6x6 layout (Row, Col) 0-indexed
const iconMapping = [
  // Row 0
  { name: 'mandalay_bay', row: 0, col: 0 },
  { name: 'w_las_vegas', row: 0, col: 1 },
  { name: 'luxor', row: 0, col: 2 },
  { name: 'excalibur', row: 0, col: 3 },
  { name: 'new_york_new_york', row: 0, col: 4 },
  { name: 'park_mgm', row: 0, col: 5 },
  // Row 1
  { name: 'aria', row: 1, col: 0 },
  { name: 'vdara', row: 1, col: 1 },
  { name: 'bellagio', row: 1, col: 2 },
  { name: 'caesars_palace', row: 1, col: 3 },
  { name: 'hard_rock_las_vegas', row: 1, col: 4 },
  { name: 'treasure_island', row: 1, col: 5 },
  // Row 2
  { name: 'fashion_show_las_vegas', row: 2, col: 0 },
  { name: 'trump_international_hotel', row: 2, col: 1 },
  { name: 'resorts_world_las_vegas', row: 2, col: 2 },
  { name: 'circus_circus_las_vegas', row: 2, col: 3 },
  { name: 'the_strat_hotel', row: 2, col: 4 },
  { name: 'mgm_grand', row: 2, col: 5 },
  // Row 3
  { name: 'paris_las_vegas', row: 3, col: 0 },
  { name: 'horseshoe_las_vegas', row: 3, col: 1 },
  { name: 'vanderpump_hotel', row: 3, col: 2 },
  { name: 'flamingo_las_vegas', row: 3, col: 3 },
  { name: 'the_linq', row: 3, col: 4 },
  { name: 'harrahs_las_vegas', row: 3, col: 5 },
  // Row 4
  { name: 'casino_royale', row: 4, col: 0 },
  { name: 'the_venetian_resort', row: 4, col: 1 },
  { name: 'the_palazzo', row: 4, col: 2 },
  { name: 'wynn_las_vegas', row: 4, col: 3 },
  { name: 'encore_at_wynn_las_vegas', row: 4, col: 4 },
  { name: 'fontainebleau_las_vegas', row: 4, col: 5 },
  // Row 5
  { name: 'sahara_las_vegas', row: 5, col: 0 },
  { name: 'tropicana_site', row: 5, col: 1 },
  { name: 'planet_hollywood', row: 5, col: 2 },
  { name: 'golden_nugget', row: 5, col: 3 },
  { name: 'four_queens', row: 5, col: 4 },
  { name: 'circa_resort', row: 5, col: 5 }
];

// Secondary properties mapped to existing grid icons
const duplicateMapping = {
  'binions_gambling_hall': 'golden_nugget',
  'fremont_hotel': 'planet_hollywood',
  'el_cortez': 'planet_hollywood',
  'plaza_hotel': 'the_palazzo',
  'oyo_hotel': 'planet_hollywood',
  'convention_center_westgate': 'planet_hollywood'
};

async function processIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Reading grid image: ${GRID_IMAGE}`);
  const metadata = await sharp(GRID_IMAGE).metadata();
  const width = metadata.width;
  const height = metadata.height;
  console.log(`Grid dimensions: ${width}x${height}`);

  const cellW = Math.floor(width / 6);
  const cellH = Math.floor(height / 6);
  console.log(`Cell dimensions: ${cellW}x${cellH}`);

  for (const icon of iconMapping) {
    console.log(`Processing: ${icon.name} at Row ${icon.row}, Col ${icon.col}`);
    const left = icon.col * cellW;
    const top = icon.row * cellH;

    // Crop the cell
    const croppedBuffer = await sharp(GRID_IMAGE)
      .extract({ left, top, width: cellW, height: cellH })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rawData = croppedBuffer.data;
    const info = croppedBuffer.info;
    const channels = info.channels; // usually 3 (RGB) or 4 (RGBA)

    // Create a new buffer with 4 channels (RGBA) for transparency
    const transparentData = Buffer.alloc(cellW * cellH * 4);

    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const srcIdx = (y * cellW + x) * channels;
        const destIdx = (y * cellW + x) * 4;

        const r = rawData[srcIdx];
        const g = rawData[srcIdx + 1];
        const b = rawData[srcIdx + 2];

        // Simple brightness calculation
        const brightness = (r + g + b) / 3;

        // Alpha keying with smooth feathering
        // Black is transparent, brighter pixels are solid
        let alpha = 255;
        const lowThreshold = 20; // values below this are fully transparent
        const highThreshold = 45; // values above this are fully opaque

        if (brightness < lowThreshold) {
          alpha = 0;
        } else if (brightness < highThreshold) {
          alpha = Math.floor(((brightness - lowThreshold) / (highThreshold - lowThreshold)) * 255);
        }

        transparentData[destIdx] = r;
        transparentData[destIdx + 1] = g;
        transparentData[destIdx + 2] = b;
        transparentData[destIdx + 3] = alpha;
      }
    }

    // Save to file, resizing to 100x100 PNG
    const outPath = path.join(OUTPUT_DIR, `${icon.name}.png`);
    await sharp(transparentData, {
      raw: {
        width: cellW,
        height: cellH,
        channels: 4
      }
    })
      .resize(100, 100)
      .png()
      .toFile(outPath);

    console.log(`Saved: ${outPath}`);
  }

  // Handle duplicates
  for (const [dupName, srcName] of Object.entries(duplicateMapping)) {
    const srcPath = path.join(OUTPUT_DIR, `${srcName}.png`);
    const destPath = path.join(OUTPUT_DIR, `${dupName}.png`);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied duplicate: ${srcName}.png -> ${dupName}.png`);
    } else {
      console.error(`Source file not found for duplicate: ${srcPath}`);
    }
  }

  console.log('All icons cropped, keyed, and saved successfully!');
}

processIcons().catch(console.error);
