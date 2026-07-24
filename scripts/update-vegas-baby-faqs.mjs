import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@sanity/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

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

// Helper to generate a random 12-char key for Sanity blocks
function makeKey() {
  return Math.random().toString(36).substring(2, 14);
}

// Construct the FAQ blocks
const faqBlocks = [
  // FAQ 1
  {
    _key: makeKey(),
    _type: 'block',
    style: 'h3',
    children: [{ _key: makeKey(), _type: 'span', text: 'Is Vegas Safe for babies?' }],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    children: [
      {
        _key: makeKey(),
        _type: 'span',
        text: 'In short, absolutely. Las Vegas is just as safe as most major cities, with a crime rate lower than popular cities like San Francisco and Los Angeles. In fact, most of the crime in Vegas happens off the strip. The major luxury hotels and casinos have great security and are very safe for families. From our extensive experience, my advice is to stay on the main Vegas Strip, but like any city, stay out too late after dark, and you’ll be just fine.'
      }
    ],
    markDefs: []
  },
  
  // FAQ 2
  {
    _key: makeKey(),
    _type: 'block',
    style: 'h3',
    children: [{ _key: makeKey(), _type: 'span', text: 'Are babies allowed in casinos?' }],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    children: [
      {
        _key: makeKey(),
        _type: 'span',
        text: 'Yes (and no). I mean, you can’t stop and gamble in the casino with your little one, but you can freely walk through the casinos with your baby and stroller. Don’t worry, you won’t be the only one either! You will be amazed at how many families will be strolling their babies through the casino right alongside you.'
      }
    ],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'localImage',
    alt: 'Baby stroller in Las Vegas Casino with kids',
    caption: '',
    src: '/images/Strolling-baby-in-Las-Vegas-Casino.gif'
  },

  // FAQ 3
  {
    _key: makeKey(),
    _type: 'block',
    style: 'h3',
    children: [{ _key: makeKey(), _type: 'span', text: 'Where is a safe, cool place to walk with a stroller in Vegas?' }],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    children: [
      {
        _key: makeKey(),
        _type: 'span',
        text: 'All the casinos along the strip are perfectly safe for you to walk your stroller in Vegas. Many Vegas resorts on the strip also have extensive indoor shopping areas and malls. Outside on the strip is fine too (weather permitting), it is just busier and may be difficult in some places to access elevators and bridges. In fact, many hotels have bridges that connect to other hotels across Las Vegas Blvd (the "strip") and other main streets, which are helpful to avoid car traffic along the strip.'
      }
    ],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'localImage',
    alt: 'Stroller Baby Las Vegas Shopping Mall',
    caption: '',
    src: '/images/Strolling-baby-in-Las-Vegas-Shopping-Mall.gif'
  },

  // FAQ 4
  {
    _key: makeKey(),
    _type: 'block',
    style: 'h3',
    children: [{ _key: makeKey(), _type: 'span', text: 'Are there any fun things to do in Las Vegas with baby?' }],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    children: [
      {
        _key: makeKey(),
        _type: 'span',
        text: 'Despite what you may have heard, there is actually very little you can’t do with a baby in Vegas. Ok, ok, you obviously can\'t gamble or go to clubs or 21+ shows or lounges. But you can walk around pretty much everywhere else and explore the fun sites and plentiful shopping areas. There are numerous family-friendly Vegas shows that allow children under 5. You can check out an exhibit or attraction that interests you and your family. Finally, there are TONS of family-friendly restaurants located in all the major hotels on the Vegas strip.'
      }
    ],
    markDefs: []
  },
  {
    _key: makeKey(),
    _type: 'localImage',
    alt: 'Baby at Las Vegas Show Tournament of Kings',
    caption: '',
    src: '/images/Baby-in-Las-Vegas-Show-Tournament-of-kings.gif'
  }
];

async function run() {
  const query = `*[_type == "post" && slug.current == "advice-las-vegas-with-baby-infant-itinerary"]`;
  const documents = await client.fetch(query);
  
  if (documents.length === 0) {
    console.log("No posts found in Sanity.");
    return;
  }

  console.log(`Found ${documents.length} matching documents in Sanity.`);

  for (const doc of documents) {
    console.log(`Processing document: ${doc._id}`);
    const body = doc.body || [];

    // Find the index of heading block: "Frequently Asked Questions About Babies In Vegas"
    const headingIndex = body.findIndex(b => 
      b._type === 'block' && 
      b.style === 'h2' && 
      b.children?.some(c => c.text.includes('Frequently Asked Questions About Babies In Vegas'))
    );

    if (headingIndex === -1) {
      console.log(`  ✗ Heading not found in document ${doc._id}. Skipping.`);
      continue;
    }

    // Check if FAQs are already present
    const nextBlock = body[headingIndex + 1];
    const isAlreadyInserted = nextBlock && 
      nextBlock._type === 'block' && 
      nextBlock.children?.some(c => c.text.includes('Is Vegas Safe for babies?'));

    if (isAlreadyInserted) {
      console.log(`  ✓ FAQs already inserted in document ${doc._id}. Skipping.`);
      continue;
    }

    // Insert FAQ blocks after headingIndex
    const updatedBody = [
      ...body.slice(0, headingIndex + 1),
      ...faqBlocks,
      ...body.slice(headingIndex + 1)
    ];

    console.log(`  Updating body length from ${body.length} to ${updatedBody.length} blocks...`);
    
    await client
      .patch(doc._id)
      .set({ body: updatedBody })
      .commit();
      
    console.log(`  ✓ Successfully updated document ${doc._id} in Sanity!`);
  }
}

run().catch(console.error);
