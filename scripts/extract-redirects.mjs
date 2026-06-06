import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const xmlPath = join(process.cwd(), 'wp-export.xml');
if (!existsSync(xmlPath)) {
  console.error('Error: wp-export.xml not found!');
  process.exit(1);
}

console.log('Reading wp-export.xml...');
const xml = readFileSync(xmlPath, 'utf8');
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
const redirects = [];

console.log('Parsing affiliate links...');
while ((match = itemRegex.exec(xml)) !== null) {
  const itemXml = match[1];
  
  if (itemXml.includes('<wp:post_type><![CDATA[thirstylink]]></wp:post_type>') || itemXml.includes('<wp:post_type>thirstylink</wp:post_type>')) {
    const statusMatch = itemXml.match(/<wp:status><\!\[CDATA\[(.*?)\]\]><\/wp:status>/) || itemXml.match(/<wp:status>(.*?)<\/wp:status>/);
    const status = statusMatch ? statusMatch[1] : '';
    
    if (status === 'publish') {
      const slugMatch = itemXml.match(/<wp:post_name><\!\[CDATA\[(.*?)\]\]><\/wp:post_name>/) || itemXml.match(/<wp:post_name>(.*?)<\/wp:post_name>/);
      const slug = slugMatch ? slugMatch[1] : '';
      
      const destMatch = itemXml.match(/<wp:meta_key><\!\[CDATA\[_ta_destination_url\]\]><\/wp:meta_key>[\s\S]*?<wp:meta_value><\!\[CDATA\[(.*?)\]\]><\/wp:meta_value>/);
      const destUrl = destMatch ? destMatch[1] : '';
      
      if (slug && destUrl) {
        const cleanDestUrl = destUrl
          .replace(/&amp;/g, '&')
          .replace(/&#038;/g, '&')
          .trim();

        let finalDestUrl = cleanDestUrl;

        const isCJLink = /anrdoezrs\.net|jdoqocy\.com|kqzyfj\.com|tkqlhce\.com|dpbolvw\.net/i.test(finalDestUrl);
        if (isCJLink && finalDestUrl.toLowerCase().includes('tripadvisor.com')) {
          if (finalDestUrl.includes('?url=')) {
            const urlParamMatch = finalDestUrl.match(/[?&]url=([^&]+)/i);
            if (urlParamMatch) {
              try {
                finalDestUrl = decodeURIComponent(urlParamMatch[1]);
              } catch (e) {}
            }
          } else if (finalDestUrl.toLowerCase().includes('/links/8336032/type/dlg/http')) {
            const parts = finalDestUrl.split('/links/8336032/type/dlg/');
            if (parts.length > 1) {
              finalDestUrl = parts[1];
            }
          }
        }

        if (finalDestUrl.toLowerCase().includes('airbnb.com')) {
          if (finalDestUrl.toLowerCase().includes('/rooms/')) {
            const roomMatch = finalDestUrl.match(/(https?:\/\/(?:www\.)?airbnb\.com\/rooms\/\d+)/i);
            if (roomMatch) {
              finalDestUrl = roomMatch[1];
            }
          } else if (finalDestUrl.toLowerCase().includes('/associates/')) {
            finalDestUrl = 'https://www.airbnb.com/';
          }
        }

        redirects.push({
          slug,
          destUrl: finalDestUrl
        });
      }
    }
  }
}

const dataDir = join(process.cwd(), 'src', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const outputPath = join(dataDir, 'affiliate-redirects.json');
writeFileSync(outputPath, JSON.stringify(redirects, null, 2), 'utf8');
console.log(`Success! Extracted ${redirects.length} affiliate links to ${outputPath}`);
