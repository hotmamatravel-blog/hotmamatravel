// scripts/audit-links.mjs
// Crawls hotmamatravel.com to audit internal pages and assets for 404s.

import fs from 'fs';
import path from 'path';

const START_URL = 'https://www.hotmamatravel.com';
const DOMAIN = 'hotmamatravel.com';
const REPORT_PATH = './link-audit-report.md';

const queue = [START_URL];
const crawledPages = new Set();
const testedAssets = new Set();
const brokenLinks = []; // Array of { source, target, type, status, error }
let processedCount = 0;

function isInternal(url) {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return url.includes(DOMAIN);
}

function normalizeUrl(url, base) {
  try {
    const absolute = new URL(url, base);
    // Strip trailing slashes and hash parameters for consolidation
    let clean = absolute.origin + absolute.pathname;
    if (clean.endsWith('/') && clean !== START_URL + '/') {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch (err) {
    return null;
  }
}

function isHtmlPage(url) {
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname).toLowerCase();
  // If it has no extension, or ends in html/php/xml etc.
  return !ext || ['.html', '.htm', '.php', '.xml', '.astro'].includes(ext);
}

async function testUrl(url, sourceUrl, isAsset = false) {
  try {
    // If we've already checked it and it was fine, skip
    if (isAsset && testedAssets.has(url)) return true;
    if (!isAsset && crawledPages.has(url)) return true;

    // Use HEAD request to test existence quickly, fallback to GET if not allowed
    let response;
    try {
      response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (response.status === 405) {
        response = await fetch(url, { method: 'GET', redirect: 'follow' });
      }
    } catch {
      response = await fetch(url, { method: 'GET', redirect: 'follow' });
    }

    if (response.status >= 400) {
      brokenLinks.push({
        source: sourceUrl,
        target: url,
        type: isAsset ? 'Asset' : 'Page',
        status: response.status,
        error: response.statusText || 'Error Status'
      });
      console.log(`❌ Broken Link [${response.status}]: ${url} (Found on: ${sourceUrl})`);
      return false;
    }

    if (isAsset) {
      testedAssets.add(url);
    }
    return true;
  } catch (err) {
    brokenLinks.push({
      source: sourceUrl,
      target: url,
      type: isAsset ? 'Asset' : 'Page',
      status: 'Fetch Error',
      error: err.message
    });
    console.log(`❌ Fetch Error: ${url} (Found on: ${sourceUrl}) - ${err.message}`);
    return false;
  }
}

async function crawlPage(url) {
  if (crawledPages.has(url)) return;
  crawledPages.add(url);
  processedCount++;

  console.log(`\n🔍 [${processedCount}] Crawling Page: ${url}`);
  
  try {
    const res = await fetch(url);
    if (res.status >= 400) {
      // The page itself is broken
      return;
    }
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return;
    }

    const html = await res.text();
    
    // Extract links
    const linkRegex = /href=["']([^"']+)["']/gi;
    let match;
    const internalLinksOnPage = new Set();
    const assetsOnPage = new Set();

    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) {
        continue;
      }

      if (isInternal(link)) {
        const fullUrl = normalizeUrl(link, url);
        if (fullUrl) {
          if (isHtmlPage(fullUrl)) {
            internalLinksOnPage.add(fullUrl);
          } else {
            assetsOnPage.add(fullUrl);
          }
        }
      }
    }

    // Extract images/src
    const srcRegex = /src=["']([^"']+)["']/gi;
    while ((match = srcRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith('data:')) continue;
      if (isInternal(src)) {
        const fullUrl = normalizeUrl(src, url);
        if (fullUrl) {
          assetsOnPage.add(fullUrl);
        }
      }
    }

    // Process all discovered internal pages
    for (const pageUrl of internalLinksOnPage) {
      if (!crawledPages.has(pageUrl) && !queue.includes(pageUrl)) {
        queue.push(pageUrl);
      }
    }

    // Test all discovered assets immediately
    for (const assetUrl of assetsOnPage) {
      await testUrl(assetUrl, url, true);
    }

  } catch (err) {
    console.error(`Error crawling ${url}:`, err.message);
  }
}

async function startAudit() {
  console.log('🚀 Starting Comprehensive Link Audit (Internal Links & Assets only)...');
  
  while (queue.length > 0) {
    const nextUrl = queue.shift();
    await crawlPage(nextUrl);
    // Add small delay to be polite to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n--- Link Audit Complete ---');
  console.log(`Pages Crawled: ${crawledPages.size}`);
  console.log(`Assets Verified: ${testedAssets.size}`);
  console.log(`Broken Links Found: ${brokenLinks.length}`);

  writeReport();
}

function writeReport() {
  let content = `# Comprehensive Link Audit Report (Internal Links)

**Audit Date**: ${new Date().toLocaleDateString()}
- **Total Pages Audited**: ${crawledPages.size}
- **Total Assets Verified**: ${testedAssets.size}
- **Broken Links Identified**: ${brokenLinks.length}

---

## 404 / Broken Links Listing

`;

  if (brokenLinks.length === 0) {
    content += `### 🎉 Success! No broken internal links or assets were found on your site.`;
  } else {
    // Group by source URL
    const grouped = {};
    brokenLinks.forEach(item => {
      if (!grouped[item.source]) grouped[item.source] = [];
      grouped[item.source].push(item);
    });

    for (const [source, list] of Object.entries(grouped)) {
      content += `### Found on [${new URL(source).pathname || '/'}](${source})\n`;
      content += `| Target URL / Asset | Type | Status | Details |\n`;
      content += `| :--- | :--- | :--- | :--- |\n`;
      list.forEach(item => {
        const displayTarget = item.target.replace('https://www.hotmamatravel.com', '');
        content += `| [${displayTarget}](${item.target}) | ${item.type} | **${item.status}** | ${item.error} |\n`;
      });
      content += `\n`;
    }
  }

  fs.writeFileSync(REPORT_PATH, content, 'utf8');
  console.log(`\n📝 Report successfully saved to: ${REPORT_PATH}`);
}

startAudit();
