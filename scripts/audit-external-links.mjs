// scripts/audit-external-links.mjs
// Crawls hotmamatravel.com to identify and verify all external outbound links.

import fs from 'fs';
import path from 'path';

const START_URL = 'https://www.hotmamatravel.com';
const DOMAIN = 'hotmamatravel.com';
const REPORT_PATH = './external-link-audit-report.md';

const queue = [START_URL];
const crawledPages = new Set();
const allExternalLinks = new Map(); // url -> Set of source pages
const testedExternalLinks = new Map(); // url -> { status, error }

const MAX_CRAWL_CONCURRENCY = 15;
let activeCrawlCount = 0;
let resolveCrawl;
const crawlPromise = new Promise(resolve => { resolveCrawl = resolve; });

function isInternal(url) {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return url.includes(DOMAIN);
}

function normalizeUrl(url, base) {
  try {
    const absolute = new URL(url, base);
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
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    return !ext || ['.html', '.htm', '.php', '.xml', '.astro'].includes(ext);
  } catch {
    return false;
  }
}

// Timeout helper for fetch
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function testExternalUrl(url) {
  try {
    // Try HEAD request first (more polite and faster)
    let response;
    try {
      response = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' });
      if (response.status === 405 || response.status === 403 || response.status === 400) {
        // Fallback to GET if HEAD is not allowed/errors
        response = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
      }
    } catch {
      response = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
    }

    if (response.status >= 400) {
      return { status: response.status, error: response.statusText || 'Error Status' };
    }
    return { status: response.status, error: null };
  } catch (err) {
    let errMsg = err.message;
    if (err.name === 'AbortError') {
      errMsg = 'Request Timeout (5s)';
    }
    return { status: 'Error', error: errMsg };
  }
}

async function crawlPage(url) {
  try {
    const res = await fetchWithTimeout(url, {}, 8000);
    if (res.status >= 400) return;
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return;

    const html = await res.text();
    
    // Extract href links
    const linkRegex = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) {
        continue;
      }

      if (isInternal(link)) {
        const fullUrl = normalizeUrl(link, url);
        if (fullUrl && isHtmlPage(fullUrl)) {
          if (!crawledPages.has(fullUrl) && !queue.includes(fullUrl)) {
            queue.push(fullUrl);
          }
        }
      } else if (link.startsWith('http://') || link.startsWith('https://')) {
        // External link
        if (!allExternalLinks.has(link)) {
          allExternalLinks.set(link, new Set());
        }
        allExternalLinks.get(link).add(url);
      }
    }
  } catch (err) {
    console.error(`Failed to crawl page ${url}: ${err.message}`);
  }
}

function processCrawlQueue() {
  while (queue.length > 0 && activeCrawlCount < MAX_CRAWL_CONCURRENCY) {
    const nextUrl = queue.shift();
    if (!nextUrl || crawledPages.has(nextUrl)) continue;

    activeCrawlCount++;
    crawledPages.add(nextUrl);

    crawlPage(nextUrl).then(() => {
      activeCrawlCount--;
      processCrawlQueue();
    }).catch(err => {
      activeCrawlCount--;
      console.error(`Crawl error for ${nextUrl}:`, err);
      processCrawlQueue();
    });
  }

  if (activeCrawlCount === 0 && queue.length === 0) {
    resolveCrawl();
  }
}

async function startAudit() {
  console.log('🚀 Step 1: Crawling all internal pages to extract external links...');
  processCrawlQueue();
  await crawlPromise;

  console.log(`\nCrawl complete. Checked ${crawledPages.size} internal pages.`);
  console.log(`Discovered ${allExternalLinks.size} unique external links.`);

  console.log('\n🚀 Step 2: Verifying external links in parallel...');
  const externalList = Array.from(allExternalLinks.keys());
  let processedCount = 0;
  const totalUrls = externalList.length;

  // Run external link verification in parallel
  const MAX_TEST_CONCURRENCY = 20;
  const pool = [];
  const executing = new Set();
  
  for (let i = 0; i < externalList.length; i++) {
    const url = externalList[i];
    const task = (async () => {
      const result = await testExternalUrl(url);
      testedExternalLinks.set(url, result);
      processedCount++;
      if (processedCount % 50 === 0 || processedCount === totalUrls) {
        console.log(`Progress: ${processedCount}/${totalUrls} external URLs verified...`);
      }
    })();
    
    pool.push(task);
    executing.add(task);
    
    const clean = () => executing.delete(task);
    task.then(clean, clean);
    
    if (executing.size >= MAX_TEST_CONCURRENCY) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(pool);
  console.log('\n--- Outbound Link Verification Complete ---');
  writeReport();
}

function writeReport() {
  const brokenList = [];
  for (const [url, result] of testedExternalLinks.entries()) {
    if (result.error || result.status >= 400) {
      brokenList.push({
        url,
        status: result.status,
        error: result.error || 'HTTP Error',
        sources: Array.from(allExternalLinks.get(url) || [])
      });
    }
  }

  console.log(`Broken external links found: ${brokenList.length}`);

  let content = `# Comprehensive Outbound External Link Audit Report
  
**Audit Date**: ${new Date().toLocaleDateString()}
- **Total Internal Pages Checked**: ${crawledPages.size}
- **Total Unique External Links Checked**: ${testedExternalLinks.size}
- **Broken / Warning External Links**: ${brokenList.length}

---

## Broken / Failing External Links Listing

`;

  if (brokenList.length === 0) {
    content += `### 🎉 Success! No broken external outbound links were found on your site.`;
  } else {
    // Group by status
    const grouped = {};
    brokenList.forEach(item => {
      const key = item.status;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    for (const [status, list] of Object.entries(grouped).sort()) {
      content += `### Status Code / Error: **${status}**\n\n`;
      content += `| External Target URL | Error Detail | Found on Pages |\n`;
      content += `| :--- | :--- | :--- |\n`;
      list.forEach(item => {
        const sourcesText = item.sources.map(src => {
          const path = src.replace('https://www.hotmamatravel.com', '');
          return `[${path || '/'}](${src})`;
        }).join(', ');
        content += `| [${item.url}](${item.url}) | ${item.error} | ${sourcesText} |\n`;
      });
      content += `\n`;
    }
  }

  fs.writeFileSync(REPORT_PATH, content, 'utf8');
  console.log(`\n📝 Report successfully saved to: ${REPORT_PATH}`);
}

startAudit().catch(console.error);
