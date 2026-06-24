import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1600;

// Solid premium color palette
const COLOR_BG = '#080808';       // Rich dark matte charcoal
const COLOR_BLVD = '#c0392b';     // Deep crimson for Las Vegas Blvd
const COLOR_BLVD_DASH = '#f39c12';// Amber center dashes
const COLOR_STREET = '#922b21';   // Crimson for cross streets
const COLOR_STREET_BORDER = '#2c3e50';
const COLOR_GOLD = '#f1c40f';     // Bright metallic gold
const COLOR_TEXT_STREET = '#bdc3c7'; // Ivory/Silver for road names
const COLOR_TEXT_HOTEL = '#f39c12';  // Deep gold/Amber for hotels
const COLOR_GRID = '#1c1c1c';      // Grid lines

const svgContent = `
<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gold Gradient for Icons -->
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f39c12" />
      <stop offset="50%" stop-color="#f1c40f" />
      <stop offset="100%" stop-color="#f39c12" />
    </linearGradient>

    <!-- Stylized Hotel Icons -->
    <!-- Wave: Mandalay Bay -->
    <g id="icon-wave">
      <path d="M-6,6 C-3,3 3,9 6,6 M-6,0 C-3,-3 3,3 6,0 M-6,-6 C-3,-9 3,-3 6,-6" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g>
    <!-- Letter W: W Las Vegas / Delano -->
    <g id="icon-w">
      <path d="M-6,-6 L-3,6 L0,-2 L3,6 L6,-6" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <!-- Pyramid: Luxor -->
    <g id="icon-pyramid">
      <polygon points="0,-8 -9,6 9,6" fill="url(#gold-gradient)" opacity="0.9"/>
      <!-- Light beam -->
      <line x1="0" y1="-8" x2="0" y2="-40" stroke="#f1c40f" stroke-width="2.5" opacity="0.8"/>
    </g>
    <!-- Castle: Excalibur -->
    <g id="icon-castle">
      <path d="M-8,6 L-8,-2 L-5,-2 L-5,6 L5,6 L5,-2 L8,-2 L8,6 Z" fill="url(#gold-gradient)"/>
      <rect x="-3" y="-4" width="6" height="10" fill="url(#gold-gradient)"/>
      <polygon points="-7,-2 -5,-2 -6,-7" fill="url(#gold-gradient)"/>
      <polygon points="5,-2 7,-2 6,-7" fill="url(#gold-gradient)"/>
      <polygon points="-1,-4 1,-4 0,-9" fill="url(#gold-gradient)"/>
    </g>
    <!-- Skyline: New York-New York -->
    <g id="icon-skyline">
      <rect x="-8" y="-4" width="3" height="10" fill="url(#gold-gradient)"/>
      <rect x="-4" y="-8" width="3" height="14" fill="url(#gold-gradient)"/>
      <rect x="0" y="-12" width="3" height="18" fill="url(#gold-gradient)"/>
      <rect x="4" y="-6" width="3" height="12" fill="url(#gold-gradient)"/>
      <line x1="1" y1="-12" x2="1" y2="-16" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    </g>
    <!-- Leaf: Park MGM -->
    <g id="icon-leaf">
      <path d="M0,6 C-4,2 -4,-4 0,-8 C4,-4 4,2 0,6 Z" fill="url(#gold-gradient)"/>
      <line x1="0" y1="6" x2="0" y2="-8" stroke="#080808" stroke-width="1.5"/>
    </g>
    <!-- Geometric Tower: Aria -->
    <g id="icon-geo">
      <polygon points="-6,6 0,-10 6,6 2,6 0,-2 -2,6" fill="url(#gold-gradient)"/>
    </g>
    <!-- Crescent Tower: Vdara -->
    <g id="icon-crescent">
      <path d="M-4,6 A8,8 0 0,1 4,-6 A10,10 0 0,0 -4,6 Z" fill="url(#gold-gradient)"/>
    </g>
    <!-- Fountain Spray: Bellagio -->
    <g id="icon-fountain">
      <path d="M0,6 L0,-4 M0,-4 C-3,-8 -7,-4 -8,0 M0,-4 C3,-8 7,-4 8,0 M0,-1 C-2,-4 -5,-2 -6,2 M0,-1 C2,-4 5,-2 6,2" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <!-- Column: Caesars Palace -->
    <g id="icon-column">
      <rect x="-3" y="-6" width="6" height="12" fill="url(#gold-gradient)"/>
      <line x1="-1" y1="-6" x2="-1" y2="6" stroke="#080808" stroke-width="1"/>
      <line x1="1" y1="-6" x2="1" y2="6" stroke="#080808" stroke-width="1"/>
      <rect x="-5" y="-8" width="10" height="2" fill="url(#gold-gradient)"/>
      <rect x="-5" y="6" width="10" height="2" fill="url(#gold-gradient)"/>
    </g>
    <!-- Guitar: Hard Rock / former Mirage -->
    <g id="icon-guitar">
      <ellipse cx="0" cy="3" rx="4" ry="5" fill="url(#gold-gradient)"/>
      <rect x="-1" y="-9" width="2" height="10" fill="url(#gold-gradient)"/>
      <line x1="-2" y1="-9" x2="2" y2="-9" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    </g>
    <!-- Pirate Skull: Treasure Island -->
    <g id="icon-skull">
      <circle cx="0" cy="-2" r="4" fill="url(#gold-gradient)"/>
      <path d="M-3,3 L3,3 L2,0 L-2,0 Z" fill="url(#gold-gradient)"/>
      <line x1="-6" y1="-6" x2="6" y2="6" stroke="url(#gold-gradient)" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="-6" x2="-6" y2="6" stroke="url(#gold-gradient)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="-1.5" cy="-2" r="1" fill="#080808"/>
      <circle cx="1.5" cy="-2" r="1" fill="#080808"/>
    </g>
    <!-- Canopy/Oval: Fashion Show -->
    <g id="icon-canopy">
      <ellipse cx="0" cy="0" rx="9" ry="5" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
      <line x1="-9" y1="0" x2="9" y2="0" stroke="url(#gold-gradient)" stroke-width="1"/>
      <line x1="0" y1="-5" x2="0" y2="5" stroke="url(#gold-gradient)" stroke-width="1"/>
    </g>
    <!-- Classic Tower: Trump -->
    <g id="icon-tower">
      <rect x="-4" y="-10" width="8" height="16" fill="url(#gold-gradient)"/>
      <polygon points="0,-14 -3,-10 3,-10" fill="url(#gold-gradient)"/>
      <line x1="0" y1="-10" x2="0" y2="6" stroke="#080808" stroke-width="1"/>
    </g>
    <!-- Pagoda Tower: Resorts World -->
    <g id="icon-pagoda">
      <rect x="-4" y="0" width="8" height="6" fill="url(#gold-gradient)"/>
      <path d="M-6,0 C-3,-3 3,-3 6,0 L5,-4 C2,-6 -2,-6 -5,-4 Z" fill="url(#gold-gradient)"/>
      <polygon points="0,-9 -3,-4 3,-4" fill="url(#gold-gradient)"/>
    </g>
    <!-- Circus Tent: Circus Circus -->
    <g id="icon-tent">
      <polygon points="0,-8 -8,0 8,0" fill="url(#gold-gradient)"/>
      <rect x="-8" y="0" width="16" height="6" fill="url(#gold-gradient)"/>
      <path d="M-8,0 L-4,6 L0,0 L4,6 L8,0" fill="#080808"/>
    </g>
    <!-- Observation Needle: The STRAT -->
    <g id="icon-strat">
      <line x1="0" y1="8" x2="0" y2="-12" stroke="url(#gold-gradient)" stroke-width="2"/>
      <line x1="-4" y1="8" x2="0" y2="-4" stroke="url(#gold-gradient)" stroke-width="1.5"/>
      <line x1="4" y1="8" x2="0" y2="-4" stroke="url(#gold-gradient)" stroke-width="1.5"/>
      <ellipse cx="0" cy="-4" rx="5" ry="2.5" fill="url(#gold-gradient)"/>
      <line x1="0" y1="-4" x2="0" y2="-15" stroke="url(#gold-gradient)" stroke-width="1"/>
    </g>
    <!-- Lion: MGM Grand -->
    <g id="icon-lion">
      <circle cx="-1" cy="-2" r="3.5" fill="url(#gold-gradient)"/>
      <rect x="-4" y="1" width="8" height="5" fill="url(#gold-gradient)"/>
      <rect x="-4" y="6" width="2" height="2" fill="url(#gold-gradient)"/>
      <rect x="2" y="6" width="2" height="2" fill="url(#gold-gradient)"/>
      <path d="M4,1 Q6,-4 8,-2" stroke="url(#gold-gradient)" stroke-width="2" fill="none"/>
    </g>
    <!-- Eiffel Tower: Paris -->
    <g id="icon-eiffel">
      <path d="M-6,7 L-2,-4 L0,-11 L2,-4 L6,7 L4,7 L2,1 L-2,1 L-4,7 Z" fill="url(#gold-gradient)"/>
      <line x1="0" y1="-11" x2="0" y2="-16" stroke="url(#gold-gradient)" stroke-width="1.5"/>
      <rect x="-3" y="1" width="6" height="1.5" fill="url(#gold-gradient)"/>
    </g>
    <!-- Horseshoe: Horseshoe -->
    <g id="icon-horseshoe">
      <path d="M-5,-4 C-5,3 -2,6 0,6 C2,6 5,3 5,-4 L3,-4 C3,1 1,3 0,3 C-1,3 -3,1 -3,-4 Z" fill="url(#gold-gradient)"/>
      <circle cx="-4" cy="-4" r="1.2" fill="url(#gold-gradient)"/>
      <circle cx="4" cy="-4" r="1.2" fill="url(#gold-gradient)"/>
    </g>
    <!-- Rose: Vanderpump -->
    <g id="icon-rose">
      <circle cx="0" cy="0" r="6" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
      <path d="M-3,-1 C0,-4 3,-1 0,3 Z" fill="url(#gold-gradient)" opacity="0.8"/>
      <path d="M0,6 L0,9" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    </g>
    <!-- Flamingo: Flamingo -->
    <g id="icon-flamingo">
      <path d="M-2,-2 C-2,-6 2,-8 2,-4 C2,0 -4,0 -2,4 L-3,8 M-1,4 L0,8" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="-2" cy="1" rx="3" ry="2" fill="url(#gold-gradient)"/>
    </g>
    <!-- Ferris Wheel: LINQ (High Roller) -->
    <g id="icon-wheel">
      <circle cx="0" cy="-2" r="7" fill="none" stroke="url(#gold-gradient)" stroke-width="2"/>
      <circle cx="0" cy="-2" r="1.5" fill="url(#gold-gradient)"/>
      <line x1="0" y1="5" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1.5"/>
      <line x1="-5" y1="3" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
      <line x1="5" y1="3" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
      <line x1="-7" y1="-2" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
      <line x1="7" y1="-2" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="1"/>
    </g>
    <!-- Jester Hat: Harrah's -->
    <g id="icon-jester">
      <path d="M-6,4 Q-4,-6 0,-2 Q4,-6 6,4 Z" fill="url(#gold-gradient)"/>
      <circle cx="-6" cy="-6" r="1.2" fill="url(#gold-gradient)"/>
      <circle cx="0" cy="-7" r="1.2" fill="url(#gold-gradient)"/>
      <circle cx="6" cy="-6" r="1.2" fill="url(#gold-gradient)"/>
      <path d="M-6,4 L6,4 L4,7 L-4,7 Z" fill="url(#gold-gradient)"/>
    </g>
    <!-- Crown: Casino Royale -->
    <g id="icon-crown">
      <polygon points="-8,4 -6,-4 -2,0 0,-7 2,0 6,-4 8,4" fill="url(#gold-gradient)"/>
      <rect x="-8" y="4" width="16" height="2" fill="url(#gold-gradient)"/>
      <circle cx="-6" cy="-5" r="1" fill="url(#gold-gradient)"/>
      <circle cx="0" cy="-8" r="1" fill="url(#gold-gradient)"/>
      <circle cx="6" cy="-5" r="1" fill="url(#gold-gradient)"/>
    </g>
    <!-- Gondola: Venetian -->
    <g id="icon-gondola">
      <path d="M-9,2 C-6,5 6,5 9,2 L8,5 L-8,5 Z" fill="url(#gold-gradient)"/>
      <line x1="0" y1="2" x2="0" y2="-6" stroke="url(#gold-gradient)" stroke-width="1.5"/>
      <polygon points="0,-6 4,-4 0,-2" fill="url(#gold-gradient)"/>
    </g>
    <!-- Dome: Palazzo / Plaza -->
    <g id="icon-dome">
      <path d="M-7,4 A7,7 0 0,1 7,4 Z" fill="url(#gold-gradient)"/>
      <rect x="-8" y="4" width="16" height="2" fill="url(#gold-gradient)"/>
      <line x1="0" y1="-3" x2="0" y2="-7" stroke="url(#gold-gradient)" stroke-width="1.5"/>
    </g>
    <!-- Curved Sig: Wynn/Encore -->
    <g id="icon-sig">
      <path d="M-6,-4 C-6,8 6,8 6,-4" stroke="url(#gold-gradient)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M-4,0 C-4,-4 4,-4 4,0" stroke="url(#gold-gradient)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </g>
    <!-- Bowtie Skyscraper: Fontainebleau -->
    <g id="icon-bowtie">
      <polygon points="-4,-10 4,-10 2,10 -2,10" fill="url(#gold-gradient)"/>
      <polygon points="-4,-10 0,-4 4,-10" fill="#080808"/>
      <polygon points="-2,10 0,4 2,10" fill="#080808"/>
    </g>
    <!-- Moroccan Arch: SAHARA -->
    <g id="icon-arch">
      <path d="M-6,6 L-6,0 C-6,-4 -3,-6 0,-6 C3,-6 6,-4 6,0 L6,6 Z" fill="url(#gold-gradient)"/>
      <path d="M-3,6 L-3,2 C-3,0 -1,-1 0,-1 C1,-1 3,0 3,2 L3,6 Z" fill="#080808"/>
    </g>
    <!-- Palm Tree: Tropicana Site -->
    <g id="icon-palm">
      <line x1="0" y1="6" x2="0" y2="-2" stroke="url(#gold-gradient)" stroke-width="2"/>
      <path d="M0,-2 Q-6,-6 -8,-2 M0,-2 Q6,-6 8,-2 M0,-2 Q-4,-9 -2,-9 M0,-2 Q4,-9 2,-9" stroke="url(#gold-gradient)" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    <!-- General Star: PH, OYO, Circa, Nugget, Festival Grounds -->
    <g id="icon-star">
      <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#gold-gradient)"/>
    </g>
    <!-- Card Queens: Four Queens -->
    <g id="icon-queens">
      <rect x="-6" y="-6" width="8" height="12" rx="1" fill="url(#gold-gradient)"/>
      <rect x="-2" y="-3" width="8" height="12" rx="1" fill="url(#gold-gradient)" stroke="#080808" stroke-width="1"/>
      <text x="2" y="5" font-family="sans-serif" font-size="7" font-weight="900" fill="#080808">Q</text>
    </g>
  </defs>

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

  <!-- Title block -->
  <g transform="translate(100, 180)">
    <text x="0" y="0" fill="${COLOR_GOLD}" font-family="'Outfit', 'Inter', sans-serif" font-weight="900" font-size="42" letter-spacing="4">LAS VEGAS STRIP</text>
    <text x="0" y="24" fill="${COLOR_TEXT_STREET}" font-family="'Outfit', 'Inter', sans-serif" font-weight="600" font-size="14" letter-spacing="2">MAP INFOGRAPHIC</text>
  </g>

  <!-- Legend and Compass -->
  <g transform="translate(100, 240)">
    <!-- North Arrow -->
    <path d="M0,-15 L5,0 L1,0 L1,15 L-1,15 L-1,0 L-5,0 Z" fill="${COLOR_GOLD}"/>
    <text x="0" y="-20" fill="${COLOR_GOLD}" font-family="'Outfit', sans-serif" font-size="10" font-weight="900" text-anchor="middle">N</text>
  </g>

  <!-- Street grid - horizontal lines -->
  <g stroke="${COLOR_STREET}" stroke-linecap="round">
    <!-- Russell Rd -->
    <line x1="300" y1="1450" x2="700" y2="1450" stroke-width="6"/>
    <!-- Tropicana Ave -->
    <line x1="150" y1="1250" x2="850" y2="1250" stroke-width="8"/>
    <!-- Harmon Ave -->
    <line x1="200" y1="1050" x2="800" y2="1050" stroke-width="6"/>
    <!-- Flamingo Rd -->
    <line x1="150" y1="850" x2="850" y2="850" stroke-width="8"/>
    <!-- Sands Ave / Spring Mountain Rd -->
    <line x1="150" y1="650" x2="850" y2="650" stroke-width="8"/>
    <!-- Desert Inn Rd -->
    <line x1="200" y1="520" x2="800" y2="520" stroke-width="6"/>
    <!-- Convention Center Drive -->
    <line x1="500" y1="440" x2="800" y2="440" stroke-width="6"/>
    <!-- Sahara Ave -->
    <line x1="150" y1="350" x2="850" y2="350" stroke-width="8"/>
    <!-- Charleston Blvd -->
    <line x1="250" y1="200" x2="750" y2="200" stroke-width="8"/>
    <!-- Fremont St -->
    <line x1="100" y1="80" x2="900" y2="80" stroke-width="6" stroke="${COLOR_GOLD}"/>
  </g>

  <!-- Central Road (Las Vegas Boulevard) -->
  <line x1="500" y1="100" x2="500" y2="1550" stroke="${COLOR_BLVD}" stroke-width="12" stroke-linecap="round"/>
  <line x1="500" y1="100" x2="500" y2="1550" stroke="${COLOR_BLVD_DASH}" stroke-width="2" stroke-dasharray="8,6"/>

  <!-- Street Names Text -->
  <g font-family="'Outfit', 'Inter', sans-serif" font-weight="700" font-size="11" fill="${COLOR_TEXT_STREET}">
    <!-- Las Vegas Blvd -->
    <text x="485" y="700" font-size="16" transform="rotate(-90 485 700)" letter-spacing="4" text-anchor="middle" fill="${COLOR_GOLD}">LAS VEGAS BLVD</text>
    
    <!-- Cross streets -->
    <text x="310" y="1440">W. RUSSELL RD</text>
    <text x="160" y="1240">TROPICANA AVE</text>
    <text x="210" y="1040">HARMON AVE</text>
    <text x="160" y="840">FLAMINGO RD</text>
    <text x="160" y="640">SPRING MOUNTAIN RD</text>
    <text x="840" y="640" text-anchor="end">SANDS AVE</text>
    <text x="210" y="510">DESERT INN RD</text>
    <text x="840" y="430" text-anchor="end">CONVENTION CENTER DR</text>
    <text x="160" y="340">SAHARA AVE</text>
    <text x="260" y="190">CHARLESTON BLVD</text>
    <text x="500" y="60" text-anchor="middle" font-size="14" fill="${COLOR_GOLD}" letter-spacing="2">FREMONT ST (DOWNTOWN)</text>
  </g>

  <!-- ================= WEST SIDE (LEFT COLUMN) ================= -->
  <!-- Align labels x=430, icons x=465 -->
  <g font-family="'Outfit', 'Inter', sans-serif" font-size="13" font-weight="600" text-anchor="end" fill="#ffffff">
    <!-- Mandalay Bay -->
    <use href="#icon-wave" x="465" y="1430"/>
    <text x="435" y="1434">Mandalay Bay</text>

    <!-- W Las Vegas / Delano -->
    <use href="#icon-w" x="465" y="1480"/>
    <text x="435" y="1484">W Las Vegas (Delano)</text>

    <!-- Luxor (south of Tropicana) -->
    <use href="#icon-pyramid" x="465" y="1320"/>
    <text x="435" y="1324">Luxor</text>

    <!-- Excalibur (north of Tropicana) -->
    <use href="#icon-castle" x="465" y="1210"/>
    <text x="435" y="1214">Excalibur</text>

    <!-- New York-New York (north of Excalibur) -->
    <use href="#icon-skyline" x="465" y="1150"/>
    <text x="435" y="1154">New York-New York</text>

    <!-- Park MGM -->
    <use href="#icon-leaf" x="465" y="1100"/>
    <text x="435" y="1104">Park MGM</text>

    <!-- Aria -->
    <use href="#icon-geo" x="465" y="1040"/>
    <text x="435" y="1044">Aria</text>

    <!-- Vdara (slightly set back) -->
    <use href="#icon-crescent" x="400" y="1000"/>
    <text x="375" y="1004" fill="${COLOR_TEXT_STREET}" font-size="11">Vdara</text>

    <!-- Cosmopolitan -->
    <use href="#icon-star" x="465" y="950"/>
    <text x="435" y="954">Cosmopolitan</text>

    <!-- Bellagio (south of Flamingo, fountains face east) -->
    <use href="#icon-fountain" x="465" y="890"/>
    <text x="435" y="894">Bellagio</text>

    <!-- Caesars Palace (north of Flamingo) -->
    <use href="#icon-column" x="465" y="800"/>
    <text x="435" y="804">Caesars Palace</text>

    <!-- former Mirage site (Hard Rock) -->
    <use href="#icon-guitar" x="465" y="730"/>
    <text x="435" y="734">Hard Rock (Mirage Site)</text>

    <!-- Treasure Island (TI) -->
    <use href="#icon-skull" x="465" y="685"/>
    <text x="435" y="689">Treasure Island (TI)</text>

    <!-- Fashion Show Mall -->
    <use href="#icon-canopy" x="465" y="605"/>
    <text x="435" y="609" fill="${COLOR_TEXT_STREET}">Fashion Show</text>

    <!-- Trump International (set back) -->
    <use href="#icon-tower" x="380" y="580"/>
    <text x="355" y="584" fill="${COLOR_TEXT_STREET}" font-size="11">Trump International</text>

    <!-- Resorts World -->
    <use href="#icon-pagoda" x="465" y="475"/>
    <text x="435" y="479">Resorts World</text>

    <!-- Circus Circus (ONLY ONE ICON HERE) -->
    <use href="#icon-tent" x="465" y="405"/>
    <text x="435" y="409">Circus Circus</text>

    <!-- Festival Grounds -->
    <use href="#icon-star" x="465" y="305"/>
    <text x="435" y="309" fill="${COLOR_TEXT_STREET}">Festival Grounds</text>

    <!-- The STRAT (north of Sahara) -->
    <use href="#icon-strat" x="465" y="240"/>
    <text x="435" y="244">The STRAT</text>
  </g>

  <!-- ================= EAST SIDE (RIGHT COLUMN) ================= -->
  <!-- Align labels x=570, icons x=535 -->
  <g font-family="'Outfit', 'Inter', sans-serif" font-size="13" font-weight="600" text-anchor="start" fill="#ffffff">
    <!-- former Tropicana site -->
    <use href="#icon-palm" x="535" y="1290"/>
    <text x="565" y="1294" fill="${COLOR_TEXT_STREET}">Tropicana Site</text>

    <!-- MGM Grand (north of Tropicana, opposite Excalibur & NY-NY) -->
    <use href="#icon-lion" x="535" y="1210"/>
    <text x="565" y="1214">MGM Grand</text>

    <!-- OYO (set back) -->
    <use href="#icon-star" x="620" y="1250"/>
    <text x="645" y="1254" fill="${COLOR_TEXT_STREET}" font-size="11">OYO Hotel</text>

    <!-- Planet Hollywood (opposite Cosmopolitan) -->
    <use href="#icon-star" x="535" y="950"/>
    <text x="565" y="954">Planet Hollywood</text>

    <!-- Paris (opposite Bellagio) -->
    <use href="#icon-eiffel" x="535" y="890"/>
    <text x="565" y="894">Paris Las Vegas</text>

    <!-- Horseshoe (north of Flamingo, opposite Caesars) -->
    <use href="#icon-horseshoe" x="535" y="800"/>
    <text x="565" y="804">Horseshoe</text>

    <!-- Vanderpump Hotel -->
    <use href="#icon-rose" x="535" y="750"/>
    <text x="565" y="754">Vanderpump Hotel</text>

    <!-- Flamingo -->
    <use href="#icon-flamingo" x="535" y="710"/>
    <text x="565" y="714">Flamingo</text>

    <!-- LINQ -->
    <use href="#icon-wheel" x="535" y="670"/>
    <text x="565" y="674">The LINQ</text>

    <!-- Harrah's -->
    <use href="#icon-jester" x="535" y="630"/>
    <text x="565" y="634">Harrah's</text>

    <!-- Casino Royale -->
    <use href="#icon-crown" x="535" y="590"/>
    <text x="565" y="594">Casino Royale</text>

    <!-- Venetian (at Sands Ave) -->
    <use href="#icon-gondola" x="535" y="540"/>
    <text x="565" y="544">The Venetian</text>

    <!-- Palazzo (at Sands Ave) -->
    <use href="#icon-dome" x="535" y="495"/>
    <text x="565" y="499">The Palazzo</text>

    <!-- Wynn -->
    <use href="#icon-sig" x="535" y="450"/>
    <text x="565" y="454">Wynn Las Vegas</text>

    <!-- Encore -->
    <use href="#icon-sig" x="535" y="405"/>
    <text x="565" y="409">Encore at Wynn</text>

    <!-- Convention Center / Westgate (set back) -->
    <use href="#icon-star" x="620" y="380"/>
    <text x="645" y="384" fill="${COLOR_TEXT_STREET}" font-size="11">Convention Center / Westgate</text>

    <!-- Fontainebleau -->
    <use href="#icon-bowtie" x="535" y="325"/>
    <text x="565" y="329">Fontainebleau</text>

    <!-- SAHARA -->
    <use href="#icon-arch" x="535" y="275"/>
    <text x="565" y="279">SAHARA Las Vegas</text>
  </g>

  <!-- ================= DOWNTOWN / FREMONT STREET ================= -->
  <!-- Fremont St is at y=80. Arranged horizontally West to East with -35deg rotated labels. -->
  <g font-family="'Outfit', 'Inter', sans-serif" font-size="11" font-weight="700" fill="${COLOR_GOLD}">
    <!-- Plaza -->
    <use href="#icon-dome" x="180" y="80"/>
    <text x="180" y="105" transform="rotate(-35 180 105)" text-anchor="end">Plaza Hotel</text>

    <!-- Circa -->
    <use href="#icon-star" x="280" y="80"/>
    <text x="280" y="105" transform="rotate(-35 280 105)" text-anchor="end">Circa Resort</text>

    <!-- Golden Nugget -->
    <use href="#icon-star" x="380" y="80"/>
    <text x="380" y="105" transform="rotate(-35 380 105)" text-anchor="end">Golden Nugget</text>

    <!-- Binion's -->
    <use href="#icon-star" x="480" y="80"/>
    <text x="480" y="105" transform="rotate(-35 480 105)" text-anchor="end">Binion's</text>

    <!-- Four Queens -->
    <use href="#icon-queens" x="580" y="80"/>
    <text x="580" y="105" transform="rotate(-35 580 105)" text-anchor="end">Four Queens</text>

    <!-- Fremont -->
    <use href="#icon-star" x="680" y="80"/>
    <text x="680" y="105" transform="rotate(-35 680 105)" text-anchor="end">Fremont Hotel</text>

    <!-- El Cortez -->
    <use href="#icon-star" x="780" y="80"/>
    <text x="780" y="105" transform="rotate(-35 780 105)" text-anchor="end">El Cortez</text>
  </g>
</svg>
`;

async function main() {
  const outputDir = 'C:\\Users\\Thurmans\\.gemini\\antigravity-ide\\brain\\01968e0a-b09b-4dc4-804f-3da1b56e4bc2';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgPath = path.join(outputDir, 'vegas_strip_map_v9.svg');
  const pngPath = path.join(outputDir, 'vegas_strip_map_v9.png');

  // Save raw SVG file
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Saved SVG to: ${svgPath}`);

  // Use Sharp to render high-res PNG
  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(pngPath);
  console.log(`Rendered high-resolution PNG to: ${pngPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
