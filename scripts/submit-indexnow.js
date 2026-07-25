import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://taxiassur.com';
const HOST = new URL(SITE_URL).host;
const SITEMAP_PATH = path.join(__dirname, '../public/sitemap.xml');
const INDEXNOW_KEY_PATH = path.join(__dirname, '../public/indexnow-key.txt');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 1000;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function unescapeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    throw new Error(`Sitemap not found: ${SITEMAP_PATH}`);
  }

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => unescapeXml(match[1].trim()))
    .filter(url => url.startsWith(`${SITE_URL}/`) || url === SITE_URL)
    .filter(url => !url.includes('/backoffice/') && !url.includes('/api/'));

  return [...new Set(urls)];
}

function resolveIndexNowKey() {
  const configuredKey = process.env.INDEXNOW_KEY?.trim();
  if (configuredKey) {
    return configuredKey;
  }

  if (fs.existsSync(INDEXNOW_KEY_PATH)) {
    const fileKey = fs.readFileSync(INDEXNOW_KEY_PATH, 'utf8').trim();
    if (fileKey) {
      return fileKey;
    }
  }

  return crypto.randomUUID().replace(/-/g, '');
}

function ensureIndexNowKey(key) {
  const existingKey = fs.existsSync(INDEXNOW_KEY_PATH)
    ? fs.readFileSync(INDEXNOW_KEY_PATH, 'utf8').trim()
    : '';

  if (existingKey !== key) {
    fs.writeFileSync(INDEXNOW_KEY_PATH, `${key}\n`, 'utf8');
    console.log(`IndexNow key written to ${INDEXNOW_KEY_PATH}`);
  } else {
    console.log('IndexNow key already present');
  }
}

async function submitToIndexNow(urls, key) {
  console.log(`Submitting ${urls.length} URLs to IndexNow`);

  if (DRY_RUN) {
    console.log('Dry run enabled: no remote submission performed');
    return { successCount: urls.length, errorCount: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host: HOST,
          key,
          keyLocation: `${SITE_URL}/indexnow-key.txt`,
          urlList: batch,
        }),
      });

      if (response.ok || response.status === 202) {
        console.log(`Batch ${batchNumber}: accepted (${response.status}) - ${batch.length} URLs`);
        successCount += batch.length;
      } else {
        const errorText = await response.text();
        console.log(`Batch ${batchNumber}: failed (${response.status}) ${errorText.slice(0, 240)}`);
        errorCount += batch.length;
      }
    } catch (error) {
      console.log(`Batch ${batchNumber}: network error ${error.message}`);
      errorCount += batch.length;
    }

    if (i + BATCH_SIZE < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { successCount, errorCount };
}

async function recordSubmission(successCount, errorCount) {
  if (!supabase || DRY_RUN) {
    return;
  }

  try {
    await supabase.from('seo_indexation_tracking').insert({
      submitted_count: successCount,
      failed_count: errorCount,
      submitted_at: new Date().toISOString(),
      provider: 'indexnow',
    });
  } catch (error) {
    console.log(`Tracking insert skipped: ${error.message}`);
  }
}

async function main() {
  const key = resolveIndexNowKey();
  ensureIndexNowKey(key);

  const urls = readUrlsFromSitemap();
  if (urls.length === 0) {
    throw new Error('No URLs found in sitemap');
  }

  console.log(`Loaded ${urls.length} unique sitemap URLs`);
  console.log(`First URL: ${urls[0]}`);
  console.log(`Last URL: ${urls[urls.length - 1]}`);

  const { successCount, errorCount } = await submitToIndexNow(urls, key);
  await recordSubmission(successCount, errorCount);

  console.log(`IndexNow success: ${successCount}`);
  console.log(`IndexNow failed: ${errorCount}`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`IndexNow submission failed: ${error.message}`);
  process.exit(1);
});