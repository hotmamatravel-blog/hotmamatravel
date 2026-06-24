import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1600;

// Color Palette matching the V8 style
const COLOR_BG = '#080808';       // Rich dark matte charcoal
const COLOR_BLVD = '#c0392b';     // Deep crimson for Las Vegas Blvd
const COLOR_BLVD_DASH = '#f39c12';// Amber center dashes
const COLOR_STREET = '#922b21';   // Crimson for cross streets
const COLOR_GRID = '#141414';      // Very subtle grid lines

// 1. Build Background Map SVG (no text labels, no icons)
const backgroundSvg = `
<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${COLOR_BG}"/>

  <!-- Subtle Blueprint Grid -->
  <g stroke="${COLOR_GRID}" stroke-width="0.5">
    <line x1="100" y1="0" x2="100" y2="${SVG_HEIGHT}"/>
    <line x1="200" y1="0" x2="200" y2="${SVG_HEIGHT}"/>
    <line x1="300" y1="0" x2="300" y2="${SVG_HEIGHT}"/>
    <line x1="400" y1="0" x2="400" y2="${SVG_HEIGHT}"/>
    <line x1="500" y1="0" x2="500" y2="${SVG_HEIGHT}"/>
    <line x1="600" y1="0" x2="600" y2="${SVG_HEIGHT}"/>
    <line x1="700" y1="0" x2="700" y2="${SVG_HEIGHT}"/>
    <line x1="800" y1="0" x2="800" y2="${SVG_HEIGHT}"/>
    <line x1="900" y1="0" x2="900" y2="${SVG_HEIGHT}"/>
    
    <line x1="0" y1="100" x2="${SVG_WIDTH}" y2="100"/>
    <line x1="0" y1="200" x2="${SVG_WIDTH}" y2="200"/>
    <line x1="0" y1="300" x2="${SVG_WIDTH}" y2="300"/>
    <line x1="0" y1="400" x2="${SVG_WIDTH}" y2="400"/>
    <line x1="0" y1="500" x2="${SVG_WIDTH}" y2="500"/>
    <line x1="0" y1="600" x2="${SVG_WIDTH}" y2="600"/>
    <line x1="0" y1="700" x2="${SVG_WIDTH}" y2="700"/>
    <line x1="0" y1="800" x2="${SVG_WIDTH}" y2="800"/>
    <line x1="0" y1="900" x2="${SVG_WIDTH}" y2="900"/>
    <line x1="0" y1="1000" x2="${SVG_WIDTH}" y2="1000"/>
    <line x1="0" y1="1100" x2="${SVG_WIDTH}" y2="1100"/>
    <line x1="0" y1="1200" x2="${SVG_WIDTH}" y2="1200"/>
    <line x1="0" y1="1300" x2="${SVG_WIDTH}" y2="1300"/>
    <line x1="0" y1="1400" x2="${SVG_WIDTH}" y2="1400"/>
    <line x1="0" y1="1500" x2="${SVG_WIDTH}" y2="1500"/>
  </g>

  <!-- Labeled main streets crossing Las Vegas Boulevard (South to North) -->
  <g stroke="${COLOR_STREET}" stroke-linecap="round">
    <!-- Russell Road -->
    <line x1="200" y1="1450" x2="800" y2="1450" stroke-width="8"/>
    <!-- Tropicana Avenue -->
    <line x1="100" y1="1250" x2="900" y2="1250" stroke-width="10"/>
    <!-- Harmon Avenue -->
    <line x1="150" y1="1050" x2="850" y2="1050" stroke-width="8"/>
    <!-- Flamingo Road -->
    <line x1="100" y1="850" x2="900" y2="850" stroke-width="10"/>
    <!-- Sands Avenue / Spring Mountain Road -->
    <line x1="100" y1="650" x2="900" y2="650" stroke-width="10"/>
    <!-- Desert Inn Road -->
    <line x1="150" y1="520" x2="850" y2="520" stroke-width="8"/>
    <!-- Sahara Avenue -->
    <line x1="100" y1="350" x2="900" y2="350" stroke-width="10"/>
    <!-- Charleston Boulevard -->
    <line x1="150" y1="200" x2="850" y2="200" stroke-width="10"/>
    <!-- Fremont Street (Downtown) -->
    <line x1="100" y1="80" x2="900" y2="80" stroke-width="8"/>
  </g>

  <!-- Central Road (Las Vegas Boulevard) -->
  <line x1="500" y1="50" x2="500" y2="1550" stroke="${COLOR_BLVD}" stroke-width="16" stroke-linecap="round"/>
  <line x1="500" y1="50" x2="500" y2="1550" stroke="${COLOR_BLVD_DASH}" stroke-width="2.5" stroke-dasharray="10,8"/>
</svg>
`;

// 2. Define Custom SVG shapes for each hotel
const iconDefinitions = {
  // Mandalay Bay
  mandalay_bay: `
    <path d="M-6,6 C-3,3 3,9 6,6 M-6,0 C-3,-3 3,3 6,0 M-6,-6 C-3,-9 3,-3 6,-6" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  `,
  // Delano / W Las Vegas
  w_las_vegas: `
    <path d="M-6,-6 L-3,6 L0,-2 L3,6 L6,-6" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  `,
  // Luxor
  luxor: `
    <polygon points="0,-8 -9,6 9,6" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-8" x2="0" y2="-30" stroke="#f1c40f" stroke-width="2.5" opacity="0.8"/>
  `,
  // Excalibur
  excalibur: `
    <path d="M-8,6 L-8,-2 L-5,-2 L-5,6 L5,6 L5,-2 L8,-2 L8,6 Z" fill="url(#gold-gradient)"/>
    <rect x="-3" y="-4" width="6" height="10" fill="url(#gold-gradient)"/>
    <polygon points="-7,-2 -5,-2 -6,-7" fill="url(#gold-gradient)"/>
    <polygon points="5,-2 7,-2 6,-7" fill="url(#gold-gradient)"/>
    <polygon points="-1,-4 1,-4 0,-9" fill="url(#gold-gradient)"/>
  `,
  // NY-NY
  new_york_new_york: `
    <rect x="-8" y="-4" width="3" height="10" fill="url(#gold-gradient)"/>
    <rect x="-4" y="-8" width="3" height="14" fill="url(#gold-gradient)"/>
    <rect x="0" y="-12" width="3" height="18" fill="url(#gold-gradient)"/>
    <rect x="4" y="-6" width="3" height="12" fill="url(#gold-gradient)"/>
    <line x1="1" y1="-12" x2="1" y2="-16" stroke="url(#gold-gradient)" stroke-width="1.5"/>
  `,
  // Park MGM
  park_mgm: `
    <path d="M0,6 C-4,2 -4,-4 0,-8 C4,-4 4,2 0,6 Z" fill="url(#gold-gradient)"/>
    <line x1="0" y1="6" x2="0" y2="-8" stroke="#000000" stroke-width="1.5"/>
  `,
  // Aria
  aria: `
    <polygon points="-6,6 0,-10 6,6 2,6 0,-2 -2,6" fill="url(#gold-gradient)"/>
  `,
  // Vdara
  vdara: `
    <path d="M-4,6 A8,8 0 0,1 4,-6 A10,10 0 0,0 -4,6 Z" fill="url(#gold-gradient)"/>
  `,
  // Bellagio
  bellagio: `
    <path d="M0,6 L0,-4 M0,-4 C-3,-8 -7,-4 -8,0 M0,-4 C3,-8 7,-4 8,0 M0,-1 C-2,-4 -5,-2 -6,2 M0,-1 C2,-4 5,-2 6,2" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  // Caesars Palace
  caesars_palace: `
    <rect x="-3" y="-6" width="6" height="12" fill="url(#gold-gradient)"/>
    <line x1="-1" y1="-6" x2="-1" y2="6" stroke="#000000" stroke-width="1"/>
    <line x1="1" y1="-6" x2="1" y2="6" stroke="#000000" stroke-width="1"/>
    <rect x="-5" y="-8" width="10" height="2" fill="url(#gold-gradient)"/>
    <rect x="-5" y="6" width="10" height="2" fill="url(#gold-gradient)"/>
  `,
  // Hard Rock / Mirage
  hard_rock_las_vegas: `
    <ellipse cx="0" cy="3" rx="4" ry="5" fill="url(#gold-gradient)"/>
    <rect x="-1" y="-9" width="2" height="10" fill="url(#gold-gradient)"/>
    <line x1="-2" y1="-9" x2="2" y2="-9" stroke="url(#gold-gradient)" stroke-width="1.5"/>
  `,
  // Treasure Island
  treasure_island: `
    <circle cx="0" cy="-2" r="4" fill="url(#gold-gradient)"/>
    <path d="M-3,3 L3,3 L2,0 L-2,0 Z" fill="url(#gold-gradient)"/>
    <line x1="-6" y1="-6" x2="6" y2="6" stroke="url(#gold-gradient)" stroke-width="2" stroke-linecap="round"/>
    <line x1="6" y1="-6" x2="-6" y2="6" stroke="url(#gold-gradient)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-1.5" cy="-2" r="1" fill="#000000"/>
    <circle cx="1.5" cy="-2" r="1" fill="#000000"/>
  `,
  // Fashion Show Mall
  fashion_show_las_vegas: `
    <ellipse cx="0" cy="0" rx="9" ry="5" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
    <line x1="-9" y1="0" x2="9" y2="0" stroke="url(#gold-gradient)" stroke-width="1"/>
    <line x1="0" y1="-5" x2="0" y2="5" stroke="url(#gold-gradient)" stroke-width="1"/>
  `,
  // Palazzo
  the_palazzo: `
    <path d="M-7,4 A7,7 0 0,1 7,4 Z" fill="url(#gold-gradient)"/>
    <rect x="-8" y="4" width="16" height="2" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-3" x2="0" y2="-7" stroke="url(#gold-gradient)" stroke-width="1.5"/>
  `,
  // Venetian
  the_venetian_resort: `
    <path d="M-9,2 C-6,5 6,5 9,2 L8,5 L-8,5 Z" fill="url(#gold-gradient)"/>
    <line x1="0" y1="2" x2="0" y2="-6" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    <polygon points="0,-6 4,-4 0,-2" fill="url(#gold-gradient)"/>
  `,
  // Wynn
  wynn_las_vegas: `
    <path d="M-6,-4 C-6,8 6,8 6,-4" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M-4,0 C-4,-4 4,-4 4,0" stroke="url(#gold-gradient)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  `,
  // Encore
  encore_at_wynn_las_vegas: `
    <path d="M-6,-4 C-6,8 6,8 6,-4" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M-4,0 C-4,-4 4,-4 4,0" stroke="url(#gold-gradient)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  `,
  // Resorts World
  resorts_world_las_vegas: `
    <rect x="-4" y="0" width="8" height="6" fill="url(#gold-gradient)"/>
    <path d="M-6,0 C-3,-3 3,-3 6,0 L5,-4 C2,-6 -2,-6 -5,-4 Z" fill="url(#gold-gradient)"/>
    <polygon points="0,-9 -3,-4 3,-4" fill="url(#gold-gradient)"/>
  `,
  // Circus Circus
  circus_circus_las_vegas: `
    <polygon points="0,-8 -8,0 8,0" fill="url(#gold-gradient)"/>
    <rect x="-8" y="0" width="16" height="6" fill="url(#gold-gradient)"/>
    <path d="M-8,0 L-4,6 L0,0 L4,6 L8,0" fill="#000000"/>
  `,
  // Fontainebleau
  fontainebleau_las_vegas: `
    <polygon points="-4,-10 4,-10 2,10 -2,10" fill="url(#gold-gradient)"/>
    <polygon points="-4,-10 0,-4 4,-10" fill="#000000" opacity="0.3"/>
    <polygon points="-2,10 0,4 2,10" fill="#000000" opacity="0.3"/>
  `,
  // Sahara
  sahara_las_vegas: `
    <path d="M-6,6 L-6,0 C-6,-4 -3,-6 0,-6 C3,-6 6,-4 6,0 L6,6 Z" fill="url(#gold-gradient)"/>
    <path d="M-3,6 L-3,2 C-3,0 -1,-1 0,-1 C1,-1 3,0 3,2 L3,6 Z" fill="#000000"/>
  `,
  // STRAT
  the_strat_hotel: `
    <line x1="0" y1="8" x2="0" y2="-12" stroke="url(#gold-gradient)" stroke-width="2"/>
    <line x1="-4" y1="8" x2="0" y2="-4" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    <line x1="4" y1="8" x2="0" y2="-4" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    <ellipse cx="0" cy="-4" rx="5" ry="2.5" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-4" x2="0" y2="-15" stroke="url(#gold-gradient)" stroke-width="1"/>
  `,
  // MGM Grand
  mgm_grand: `
    <circle cx="-1" cy="-2" r="3.5" fill="url(#gold-gradient)"/>
    <rect x="-4" y="1" width="8" height="5" fill="url(#gold-gradient)"/>
    <rect x="-4" y="6" width="2" height="2" fill="url(#gold-gradient)"/>
    <rect x="2" y="6" width="2" height="2" fill="url(#gold-gradient)"/>
    <path d="M4,1 Q6,-4 8,-2" stroke="url(#gold-gradient)" stroke-width="2" fill="none"/>
  `,
  // Tropicana Site
  tropicana_site: `
    <line x1="0" y1="6" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="2"/>
    <path d="M0,-2 Q-6,-6 -8,-2 M0,-2 Q6,-6 8,-2 M0,-2 Q-4,-9 -2,-9 M0,-2 Q4,-9 2,-9" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  // OYO
  oyo_hotel: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Planet Hollywood
  planet_hollywood: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Paris
  paris_las_vegas: `
    <path d="M-6,7 L-2,-4 L0,-11 L2,-4 L6,7 L4,7 L2,1 L-2,1 L-4,7 Z" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-11" x2="0" y2="-16" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    <rect x="-3" y="1" width="6" height="1.5" fill="url(#gold-gradient)"/>
  `,
  // Horseshoe
  horseshoe_las_vegas: `
    <path d="M-5,-4 C-5,3 -2,6 0,6 C2,6 5,3 5,-4 L3,-4 C3,1 1,3 0,3 C-1,3 -3,1 -3,-4 Z" fill="url(#gold-gradient)"/>
    <circle cx="-4" cy="-4" r="1.2" fill="url(#gold-gradient)"/>
    <circle cx="4" cy="-4" r="1.2" fill="url(#gold-gradient)"/>
  `,
  // Vanderpump
  vanderpump_hotel: `
    <circle cx="0" cy="0" r="6" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
    <path d="M-3,-1 C0,-4 3,-1 0,3 Z" fill="url(#gold-gradient)" opacity="0.8"/>
    <path d="M0,6 L0,9" stroke="url(#gold-gradient)" stroke-width="1.5"/>
  `,
  // Flamingo
  flamingo_las_vegas: `
    <path d="M-2,-2 C-2,-6 2,-8 2,-4 C2,0 -4,0 -2,4 L-3,8 M-1,4 L0,8" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="-2" cy="1" rx="3" ry="2" fill="url(#gold-gradient)"/>
  `,
  // LINQ
  the_linq: `
    <circle cx="0" cy="-2" r="7" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
    <circle cx="0" cy="-2" r="1.5" fill="url(#gold-gradient)"/>
    <line x1="0" y1="5" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    <line x1="-5" y1="3" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
    <line x1="5" y1="3" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
    <line x1="-7" y1="-2" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
    <line x1="7" y1="-2" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
  `,
  // Harrah's
  harrahs_las_vegas: `
    <path d="M-6,4 Q-4,-6 0,-2 Q4,-6 6,4 Z" fill="url(#gold-gradient)"/>
    <circle cx="-6" cy="-6" r="1.2" fill="url(#gold-gradient)"/>
    <circle cx="0" cy="-7" r="1.2" fill="url(#gold-gradient)"/>
    <circle cx="6" cy="-6" r="1.2" fill="url(#gold-gradient)"/>
    <path d="M-6,4 L6,4 L4,7 L-4,7 Z" fill="url(#gold-gradient)"/>
  `,
  // Casino Royale
  casino_royale: `
    <polygon points="-8,4 -6,-4 -2,0 0,-7 2,0 6,-4 8,4" fill="url(#gold-gradient)"/>
    <rect x="-8" y="4" width="16" height="2" fill="url(#gold-gradient)"/>
    <circle cx="-6" cy="-5" r="1" fill="url(#gold-gradient)"/>
    <circle cx="0" cy="-8" r="1" fill="url(#gold-gradient)"/>
    <circle cx="6" cy="-5" r="1" fill="url(#gold-gradient)"/>
  `,
  // Trump
  trump_international_hotel: `
    <rect x="-4" y="-10" width="8" height="16" fill="url(#gold-gradient)"/>
    <polygon points="0,-14 -3,-10 3,-10" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-10" x2="0" y2="6" stroke="#000000" stroke-width="1"/>
  `,
  // Convention Center / Westgate
  convention_center_westgate: `
    <polygon points="-8,4 -8,-4 0,-8 8,-4 8,4" fill="url(#gold-gradient)"/>
    <line x1="-8" y1="-4" x2="8" y2="-4" stroke="#000000" stroke-width="1"/>
    <line x1="0" y1="-8" x2="0" y2="4" stroke="#000000" stroke-width="1"/>
  `,
  // Circa
  circa_resort: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Golden Nugget
  golden_nugget: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Binion's
  binions_gambling_hall: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Four Queens
  four_queens: `
    <rect x="-6" y="-6" width="8" height="12" rx="1" fill="url(#gold-gradient)"/>
    <rect x="-2" y="-3" width="8" height="12" rx="1" fill="url(#gold-gradient)" stroke="#080808" stroke-width="1"/>
  `,
  // Fremont Hotel
  fremont_hotel: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `,
  // Plaza Hotel
  plaza_hotel: `
    <path d="M-7,4 A7,7 0 0,1 7,4 Z" fill="url(#gold-gradient)"/>
    <rect x="-8" y="4" width="16" height="2" fill="url(#gold-gradient)"/>
    <line x1="0" y1="-3" x2="0" y2="-7" stroke="url(#gold-gradient)" stroke-width="1.5"/>
  `,
  // El Cortez
  el_cortez: `
    <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
  `
};

// Function to generate an icon SVG string
function getIconSvg(pathContent) {
  return `
<svg width="100" height="100" viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f39c12" />
      <stop offset="50%" stop-color="#f1c40f" />
      <stop offset="100%" stop-color="#f39c12" />
    </linearGradient>
  </defs>
  <g transform="scale(1.8)">
    ${pathContent}
  </g>
</svg>
`;
}

async function main() {
  const baseDir = 'C:\\Users\\Thurmans\\.gemini\\antigravity-ide\\brain\\01968e0a-b09b-4dc4-804f-3da1b56e4bc2';
  const assetsDir = path.join(baseDir, 'map_assets');

  // Ensure directories exist
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Generate and save the background map PNG
  const bgPngPath = path.join(baseDir, 'vegas_map_background.png');
  await sharp(Buffer.from(backgroundSvg))
    .png()
    .toFile(bgPngPath);
  console.log(`Rendered clean background map to: ${bgPngPath}`);

  // 2. Generate and save each transparent hotel icon
  for (const [name, pathContent] of Object.entries(iconDefinitions)) {
    const iconSvg = getIconSvg(pathContent);
    const iconPngPath = path.join(assetsDir, `${name}.png`);

    await sharp(Buffer.from(iconSvg))
      .png()
      .toFile(iconPngPath);
    console.log(`Rendered icon: ${name}.png`);
  }

  console.log('All assets generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
