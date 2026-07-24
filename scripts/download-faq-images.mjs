import { writeFileSync, existsSync, readFileSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@sanity/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// ---- Parse .env manually ----
const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || 'ogxrlxz8',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2024-03-19'
});

const downloads = [
  {
    url: 'https://web.archive.org/web/2021im_/https://hotmamatravel.com/wp-content/uploads/2019/01/Strolling-baby-in-Las-Vegas-Casino.gif',
    filename: 'Strolling-baby-in-Las-Vegas-Casino.gif'
  },
  {
    url: 'https://web.archive.org/web/2021im_/https://hotmamatravel.com/wp-content/uploads/2019/01/Strolling-baby-in-Las-Vegas-Shopping-Mall.gif',
    filename: 'Strolling-baby-in-Las-Vegas-Shopping-Mall.gif'
  }
];

async function run() {
  for (const item of downloads) {
    const destPath = join(projectRoot, 'public', 'images', item.filename);
    if (!existsSync(destPath)) {
      console.log(`Downloading ${item.filename} from Wayback Machine: ${item.url}...`);
      try {
        const res = await fetch(item.url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const buffer = await res.arrayBuffer();
        writeFileSync(destPath, Buffer.from(buffer));
        console.log(`  ✓ Successfully downloaded from Wayback Machine.`);
        
        // Upload to Sanity
        console.log(`  Uploading ${item.filename} to Sanity...`);
        const stream = createReadStream(destPath);
        await client.assets.upload('image', stream, {
          filename: item.filename,
          label: item.filename
        });
        console.log(`  ✓ Successfully uploaded to Sanity CMS.`);
      } catch (err) {
        console.error(`  ✗ Error processing ${item.filename}:`, err.message);
      }
    } else {
      console.log(`${item.filename} already exists locally.`);
    }
  }
}

run().catch(console.error);
