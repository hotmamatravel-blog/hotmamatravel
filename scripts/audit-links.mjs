import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const xmlPath = join(projectRoot, 'wp-export.xml');
const vercelConfigPath = join(projectRoot, 'vercel.json');
const blogContentDir = join(projectRoot, 'src', 'content', 'blog');
const reportPath = join(projectRoot, 'audit-report.txt');

console.log('🔍 Starting website link and URL audit...');

// Helpers
function extractText(xml, tag) {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'm'));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'm'));
  return plainMatch ? plainMatch[1].trim() : '';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function slugifyTag(text) {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  
  if (slug.startsWith('hot-') && slug !== 'hot-road-trips' && slug !== 'hot-tips') {
    slug = slug.substring(4);
  }
  
  if (slug === 'family-travels') slug = 'family-travel';
  
  return slug;
}

// 1. Read WordPress export file
if (!existsSync(xmlPath)) {
  console.error(`❌ wp-export.xml not found at ${xmlPath}`);
  process.exit(1);
}
console.log('📖 Reading wp-export.xml...');
const xml = readFileSync(xmlPath, 'utf8');

// 2. Gather original post/page slugs & thirstylinks from XML
console.log('📊 Indexing WordPress items...');
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
const wpPosts = new Set();
const wpPages = new Set();
const wpThirstyLinks = new Set();

while ((match = itemRegex.exec(xml)) !== null) {
  const itemXml = match[1];
  const postType = extractText(itemXml, 'wp:post_type');
  const status = extractText(itemXml, 'wp:status');
  
  if (status !== 'publish') continue;

  const title = extractText(itemXml, 'title') || 'Untitled';
  const slug = extractText(itemXml, 'wp:post_name') || slugify(title);

  if (postType === 'post') {
    wpPosts.add(slug);
  } else if (postType === 'page') {
    wpPages.add(slug);
  } else if (postType === 'thirstylink') {
    wpThirstyLinks.add(slug);
  }
}
console.log(`   - WordPress published posts: ${wpPosts.size}`);
console.log(`   - WordPress published pages: ${wpPages.size}`);
console.log(`   - WordPress published ThirstyAffiliates links: ${wpThirstyLinks.size}`);

// 3. Read local Astro posts
console.log('📁 Reading local Astro markdown posts...');
if (!existsSync(blogContentDir)) {
  console.error(`❌ Astro blog directory not found at ${blogContentDir}`);
  process.exit(1);
}
const localPostFiles = readdirSync(blogContentDir).filter(f => f.endsWith('.md'));
const localSlugs = new Set();
const postTags = new Set();
const postCategories = new Set();

const postData = localPostFiles.map(file => {
  const content = readFileSync(join(blogContentDir, file), 'utf8');
  
  // Extract slug from filename
  const slug = file.replace(/\.md$/, '');
  localSlugs.add(slug);

  // Parse frontmatter tags & categories (simple parse)
  const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    
    const categoryMatch = fm.match(/category:\s*"(.*?)"/);
    if (categoryMatch) {
      const cleanCat = slugifyTag(categoryMatch[1]);
      postCategories.add(cleanCat);
    }
    
    const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      tagsMatch[1].split(',').forEach(tag => {
        const cleanTag = slugifyTag(tag.trim().replace(/^"|"$/g, ''));
        if (cleanTag) postTags.add(cleanTag);
      });
    }
  }

  return { file, slug, content };
});
console.log(`   - Local Astro markdown files: ${localPostFiles.length}`);
console.log(`   - Unique tags indexed: ${postTags.size}`);
console.log(`   - Unique categories indexed: ${postCategories.size}`);

// 4. Read vercel.json redirects
let vercelRedirects = [];
if (existsSync(vercelConfigPath)) {
  try {
    const config = JSON.parse(readFileSync(vercelConfigPath, 'utf8'));
    vercelRedirects = config.redirects || [];
    console.log(`🎯 Loaded ${vercelRedirects.length} redirects from vercel.json`);
  } catch (err) {
    console.warn(`⚠️ Error reading vercel.json: ${err.message}`);
  }
} else {
  console.warn('⚠️ vercel.json not found, skipping redirect validation');
}

// 5. Scan posts for internal links & validate
console.log('🕵️ Analyzing internal links within posts...');
const brokenLinks = [];
let totalLinksScanned = 0;
let externalLinksCount = 0;
let validInternalLinksCount = 0;

postData.forEach(({ file, slug: postSlug, content }) => {
  // Find all href matches in content (standard markdown links [text](url) and HTML links <a href="url">)
  const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g);
  const mdMatches = content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  
  const allUrls = [];
  for (const m of hrefMatches) allUrls.push(m[1]);
  for (const m of mdMatches) allUrls.push(m[1]);

  allUrls.forEach(url => {
    totalLinksScanned++;

    // Filter out anchors and external sites
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      totalLinksScanned--; // don't count these as links
      return;
    }

    const isInternal = url.startsWith('/') || url.startsWith('https://hotmamatravel.com') || url.startsWith('http://localhost');
    if (!isInternal) {
      externalLinksCount++;
      return;
    }

    // Clean the URL path to get the route/slug
    let path = url;
    if (path.startsWith('https://hotmamatravel.com')) {
      path = path.slice('https://hotmamatravel.com'.length);
    } else if (path.startsWith('http://localhost')) {
      // Remove protocol and port (e.g. http://localhost:4321)
      const relativePart = path.match(/http:\/\/localhost:\d+(.*)/);
      if (relativePart) path = relativePart[1];
    }

    // Remove query string and hash
    path = path.split('?')[0].split('#')[0];
    
    // Remove trailing slash
    let cleanPath = path.trim().replace(/^\/|\/$/g, '');

    // Check if it matches a valid route
    let isValid = false;
    let reason = '';

    if (cleanPath === '' || cleanPath === 'blog') {
      isValid = true; // Homepage or Blog index
    } else if (localSlugs.has(cleanPath)) {
      isValid = true; // Matches local post slug
    } else if (cleanPath.startsWith('go/')) {
      const affiliateSlug = cleanPath.slice(3).replace(/^\/|\/$/g, '');
      if (wpThirstyLinks.has(affiliateSlug)) {
        isValid = true; // Matches thirstylink affiliate route
      } else {
        reason = `Broken affiliate link /go/${affiliateSlug} (not found in XML)`;
      }
    } else if (cleanPath.startsWith('tag/')) {
      const tagSlug = cleanPath.slice(4).replace(/^\/|\/$/g, '');
      if (postTags.has(tagSlug) || postCategories.has(tagSlug)) {
        isValid = true; // Matches a category/tag archive route
      } else {
        reason = `Tag archive '/tag/${tagSlug}' does not correspond to any active tag or category`;
      }
    } else {
      // Check if it matches a Vercel redirect source path
      const matchedRedirect = vercelRedirects.find(rule => {
        const sourceClean = rule.source.replace(/^\/|\/$/g, '');
        // simple match (handles simple routes and wildcards like categories/(.*))
        if (sourceClean === cleanPath) return true;
        if (sourceClean.includes(':') || sourceClean.includes('*') || sourceClean.includes('(.*)')) {
          const regexSource = sourceClean
            .replace(/:\w+/g, '[^/]+')
            .replace(/\(\.\*\)/g, '.*')
            .replace(/\*/g, '.*');
          return new RegExp(`^${regexSource}$`).test(cleanPath);
        }
        return false;
      });

      if (matchedRedirect) {
        isValid = true; // Covered by Vercel redirect in production
      } else {
        reason = `Path '/${cleanPath}' does not exist on new site and is not redirected`;
      }
    }

    if (isValid) {
      validInternalLinksCount++;
    } else {
      brokenLinks.push({
        postFile: file,
        postTitle: file.replace(/\.md$/, ''),
        url: url,
        resolvedPath: '/' + cleanPath,
        reason: reason
      });
    }
  });
});

// 6. Check for missing pages (were in WP but didn't import to Astro)
console.log('🔍 Checking if any WP pages/posts were skipped in migration...');
const missingFromAstro = [];
wpPosts.forEach(slug => {
  if (!localSlugs.has(slug)) {
    missingFromAstro.push({ type: 'post', slug });
  }
});
wpPages.forEach(slug => {
  if (!localSlugs.has(slug)) {
    // Check if it's handled by a custom redirect (e.g. /who-is-hot-mama -> /about)
    const isRedirected = vercelRedirects.some(r => r.source.replace(/^\/|\/$/g, '') === slug);
    const hasStaticRoute = existsSync(join(projectRoot, 'src', 'pages', `${slug}.astro`)) || existsSync(join(projectRoot, 'src', 'pages', slug, 'index.astro'));
    if (!isRedirected && !hasStaticRoute) {
      missingFromAstro.push({ type: 'page', slug });
    }
  }
});

// 7. Write report
console.log('✍️ Writing audit report...');
const reportLines = [
  `=========================================================`,
  `         HOTMAMATRAVEL WEBSITE MIGRATION AUDIT REPORT    `,
  `=========================================================`,
  `Generated: ${new Date().toLocaleString()}`,
  ``,
  `SUMMARY STATISTICS`,
  `------------------`,
  `Total migrated blog posts found:          ${localPostFiles.length}`,
  `Total original published posts in WP:     ${wpPosts.size}`,
  `Total original published pages in WP:     ${wpPages.size}`,
  `Total ThirstyAffiliates redirects found:   ${wpThirstyLinks.size}`,
  `Total internal/external links scanned:    ${totalLinksScanned}`,
  `  - External links:                       ${externalLinksCount}`,
  `  - Valid internal links/redirects:       ${validInternalLinksCount}`,
  `  - Broken/unmatched internal links:      ${brokenLinks.length}`,
  ``,
  `MISSING CONTENT FROM ASTRO (${missingFromAstro.length})`,
  `----------------------------------------`,
  missingFromAstro.length === 0 
    ? `✅ No missing content. All published WordPress posts/pages are accounted for.`
    : missingFromAstro.map(item => `⚠️  Missing ${item.type}: /${item.slug}/`).join('\n'),
  ``,
  `BROKEN / UNMATCHED INTERNAL LINKS (${brokenLinks.length})`,
  `----------------------------------------`,
  brokenLinks.length === 0
    ? `✅ No broken internal links found in post body text!`
    : brokenLinks.map((item, idx) => 
        `${idx + 1}. In Post: [${item.postFile}]\n` +
        `   Link URL:    "${item.url}"\n` +
        `   Resolved:    "${item.resolvedPath}"\n` +
        `   Reason:      ${item.reason}\n`
      ).join('\n'),
  ``,
  `RECOMMENDED ACTIONS`,
  `-------------------`,
  missingFromAstro.length > 0 ? `1. Check why some posts/pages didn't migrate. Verify if they should be deleted or manually redirect them.` : ``,
  brokenLinks.length > 0 ? `2. Fix the broken tag links or add redirects for the unmapped pages listed above.` : ``,
  `3. Deploy to staging on Vercel to verify redirect headers on a live domain.`,
  `=========================================================`,
];

writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

console.log(`\n✅ Audit complete!`);
console.log(`   - Broken internal links: ${brokenLinks.length}`);
console.log(`   - Skipped/Missing pages: ${missingFromAstro.length}`);
console.log(`📄 Report saved to: ${reportPath}`);
