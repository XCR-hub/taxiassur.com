#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, '../src/pages');
const OG_IMAGE = 'https://taxiassur.com/logo-600x300.png';

const files = readdirSync(pagesDir).filter(f => f.startsWith('AssuranceTaxi') && f.endsWith('.tsx'));

let fixed = 0;
let skipped = 0;

for (const file of files) {
  const filePath = join(pagesDir, file);
  let content = readFileSync(filePath, 'utf-8');

  if (content.includes('property="og:') || content.includes("property='og:")) {
    skipped++;
    continue;
  }

  // Extract title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  // Extract description - handle multi-line
  const descMatch = content.match(/name="description"\s+content="([^"]+)"/s) ||
                    content.match(/content="([^"]+)"\s+name="description"/s);
  // Extract canonical
  const canonicalMatch = content.match(/href="(https:\/\/taxiassur\.com\/[^"]+)"/);

  if (!titleMatch || !canonicalMatch) {
    console.log(`Skipping ${file} - could not extract required meta tags`);
    skipped++;
    continue;
  }

  const title = titleMatch[1].replace(/"/g, '&quot;');
  const description = descMatch
    ? descMatch[1].replace(/"/g, '&quot;')
    : title;
  const url = canonicalMatch[1];

  const ogTags = `        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:image" content="${OG_IMAGE}" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${OG_IMAGE}" />
      </Helmet>`;

  // Replace closing </Helmet> tag with OG tags + </Helmet>
  const newContent = content.replace('</Helmet>', ogTags);

  if (newContent === content) {
    console.log(`Skipping ${file} - could not find </Helmet>`);
    skipped++;
    continue;
  }

  writeFileSync(filePath, newContent, 'utf-8');
  console.log(`Fixed OG tags: ${file}`);
  fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
