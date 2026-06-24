import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1500;

// Color Palette for geographical road map
const COLOR_BG = '#0e0e12';             // Deep dark charcoal
const COLOR_FREEWAY = '#ff3b30';        // Vibrant glowing neon red for I-15 & US-95
const COLOR_MAJOR = '#ff453a';          // Crimson red for main arteries (LV Blvd, cross streets)
const COLOR_SECONDARY = '#9b2226';      // Muted dark red for grid streets (Decatur, Valley View, Paradise, etc.)

// SVG Content Construction
const svgContent = `
<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft outer glow for the main freeways -->
    <filter id="glow-freeway" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    
    <!-- Milder glow for major streets -->
    <filter id="glow-major" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Dark Textured-like Background -->
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${COLOR_BG}"/>
  
  <!-- Subtle Grid Pattern overlays for cartographic depth -->
  <g stroke="#1a1a24" stroke-width="0.5" opacity="0.3">
    <!-- Vertical grid lines -->
    <line x1="100" y1="0" x2="100" y2="${SVG_HEIGHT}"/>
    <line x1="200" y1="0" x2="200" y2="${SVG_HEIGHT}"/>
    <line x1="300" y1="0" x2="300" y2="${SVG_HEIGHT}"/>
    <line x1="400" y1="0" x2="400" y2="${SVG_HEIGHT}"/>
    <line x1="500" y1="0" x2="500" y2="${SVG_HEIGHT}"/>
    <line x1="600" y1="0" x2="600" y2="${SVG_HEIGHT}"/>
    <line x1="700" y1="0" x2="700" y2="${SVG_HEIGHT}"/>
    <line x1="800" y1="0" x2="800" y2="${SVG_HEIGHT}"/>
    <line x1="900" y1="0" x2="900" y2="${SVG_HEIGHT}"/>
    
    <!-- Horizontal grid lines -->
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
  </g>

  <!-- ================= SECONDARY STREETS (Muted Red, Thin) ================= -->
  <g stroke="${COLOR_SECONDARY}" stroke-width="3.5" fill="none" opacity="0.7" stroke-linecap="round" stroke-linejoin="round">
    <!-- Decatur Boulevard (Far West) -->
    <path d="M 60,0 L 60,${SVG_HEIGHT}" />
    
    <!-- Valley View Boulevard (West Central) -->
    <path d="M 220,0 L 220,${SVG_HEIGHT}" />
    
    <!-- Koval Lane (East of Strip) -->
    <path d="M 600,680 L 600,1220" />
    
    <!-- Paradise Road (East side grid with curves) -->
    <path d="M 780,1500 L 780,680 Q 780,500 750,350 L 720,200 L 720,0" />
    
    <!-- St. Louis Avenue -->
    <path d="M 520,380 L 1000,380" />
  </g>

  <!-- ================= MAJOR ARTERIES (Crimson, Medium, Soft Glow) ================= -->
  <g stroke="${COLOR_MAJOR}" stroke-width="5" fill="none" filter="url(#glow-major)" stroke-linecap="round" stroke-linejoin="round">
    <!-- Las Vegas Boulevard (The Strip - Tracing central vertical route) -->
    <path d="M 430,1500 L 430,1150 Q 430,950 450,700 Q 480,500 590,350 L 710,200 L 850,0" />

    <!-- Russell Road (South cross street) -->
    <path d="M 0,1420 L 1000,1420" />
    
    <!-- Tropicana Avenue -->
    <path d="M 0,1220 L 1000,1220" />
    
    <!-- Harmon Avenue (Access Road) -->
    <path d="M 380,1050 L 1000,1050" />
    
    <!-- Flamingo Road -->
    <path d="M 0,850 L 1000,850" />
    
    <!-- Spring Mountain Road / Sands Avenue (With diagonal bend) -->
    <path d="M 0,650 L 450,650 Q 550,650 700,680 L 1000,680" />
    
    <!-- Sahara Avenue -->
    <path d="M 0,350 L 1000,350" />
    
    <!-- Charleston Boulevard -->
    <path d="M 0,200 L 1000,200" />
    
    <!-- Fremont Street (Downtown) -->
    <path d="M 650,80 L 1000,80" />
  </g>

  <!-- ================= HIGHWAYS / FREEWAYS (Vibrant Red, Thick, High Glow) ================= -->
  <g stroke="${COLOR_FREEWAY}" stroke-width="9" fill="none" filter="url(#glow-freeway)" stroke-linecap="round" stroke-linejoin="round">
    <!-- Interstate 15 (Diagonal curve matching the Google Map geography) -->
    <path d="M 380,1500 L 380,1150 Q 380,850 400,700 Q 430,500 520,350 Q 610,220 670,120 L 730,0" />
    
    <!-- US-95 (Spaghetti Bowl horizontal highway) -->
    <path d="M 0,90 Q 300,50 670,120 T 1000,240" />
  </g>
</svg>
`;

async function main() {
  const outputDir = 'C:\\Users\\Thurmans\\.gemini\\antigravity-ide\\brain\\01968e0a-b09b-4dc4-804f-3da1b56e4bc2';
  
  const svgPath = path.join(outputDir, 'vegas_map_background.svg');
  const pngPath = path.join(outputDir, 'vegas_map_background.png');

  // 1. Write the clean SVG file
  fs.writeFileSync(svgPath, svgContent.trim());
  console.log(`Saved SVG background to: ${svgPath}`);

  // 2. Render to PNG using sharp (ensuring it's saved as 1000x1500 px)
  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(pngPath);
  console.log(`Rendered PNG background to: ${pngPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
