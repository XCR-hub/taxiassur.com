#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { collectPublicRuntimeConfigIssues, formatRuntimeConfigIssue } = require('./lib/runtime-public-config.cjs');

const MAX_JS_CHUNK_BYTES = Number(process.env.MAX_JS_CHUNK_BYTES || 500 * 1024);
const PRIVATE_DOCUMENT_SOURCES = [
  '/backoffice',
  '/backoffice/*',
  '/admin',
  '/admin/*',
  '/auth/*',
  '/espace-client',
  '/espace-client/*',
  '/espace-prospect',
  '/espace-prospect/*',
  '/client/*',
];
const PRIVATE_CSP_REQUIRED_FRAGMENTS = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
];
const PRIVATE_CSP_FORBIDDEN_FRAGMENTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'pinterest.com',
  'facebook.com',
];

const redirectsPath = existsSync('dist/_redirects') ? 'dist/_redirects' : 'public/_redirects';
const headersPath = existsSync('dist/_headers') ? 'dist/_headers' : 'public/_headers';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function parseRules(content) {
  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line && !line.startsWith('#'));
}

function parseHeaderBlocks(content) {
  const blocks = [];
  let current = null;

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    if (/^\s/.test(rawLine)) {
      if (!current) {
        fail(`${headersPath}:${index + 1} header appears before any path rule`);
        return;
      }
      const separator = line.indexOf(':');
      if (separator === -1) {
        fail(`${headersPath}:${index + 1} invalid header syntax`);
        return;
      }
      current.headers.push({
        name: line.slice(0, separator).trim().toLowerCase(),
        value: line.slice(separator + 1).trim(),
        number: index + 1,
      });
      return;
    }

    current = { source: line, headers: [], number: index + 1 };
    blocks.push(current);
  });

  return blocks;
}

function findHeaderValue(blocks, source, headerName) {
  const block = blocks.find((candidate) => candidate.source === source);
  if (!block) return '';
  const header = block.headers.find((candidate) => candidate.name === headerName.toLowerCase());
  return header?.value || '';
}

function requireHeaderIncludes(blocks, source, headerName, fragments) {
  const value = findHeaderValue(blocks, source, headerName);
  if (!value) {
    fail(`${headersPath} missing ${headerName} on ${source}`);
    return;
  }

  const normalizedValue = value.toLowerCase();
  const missing = fragments.filter((fragment) => !normalizedValue.includes(fragment.toLowerCase()));
  if (missing.length > 0) {
    fail(`${headersPath} ${source} ${headerName} must include ${missing.join(', ')}; got ${value}`);
  }
}

function requireHeaderExcludes(blocks, source, headerName, fragments) {
  const value = findHeaderValue(blocks, source, headerName);
  if (!value) return;

  const normalizedValue = value.toLowerCase();
  const forbidden = fragments.filter((fragment) => normalizedValue.includes(fragment.toLowerCase()));
  if (forbidden.length > 0) {
    fail(`${headersPath} ${source} ${headerName} must not include ${forbidden.join(', ')}; got ${value}`);
  }
}

function verifyPrivateDocumentCsp(blocks) {
  for (const source of PRIVATE_DOCUMENT_SOURCES) {
    requireHeaderIncludes(blocks, source, 'Content-Security-Policy', PRIVATE_CSP_REQUIRED_FRAGMENTS);
    requireHeaderExcludes(blocks, source, 'Content-Security-Policy', PRIVATE_CSP_FORBIDDEN_FRAGMENTS);
  }
}
function verifyHeaders(content) {
  const blocks = parseHeaderBlocks(content);

  requireHeaderIncludes(blocks, '/assets/*', 'Cache-Control', ['public', 'max-age=31536000', 'immutable']);
  for (const source of [...PRIVATE_DOCUMENT_SOURCES, '/api/*', '/env-config.js', '/deploy-info.json']) {
    requireHeaderIncludes(blocks, source, 'Cache-Control', ['no-store']);
  }
  for (const source of ['/sw.js', '/registerSW.js', '/workbox-*.js']) {
    requireHeaderIncludes(blocks, source, 'Cache-Control', ['no-cache', 'no-store', 'must-revalidate']);
  }
  requireHeaderIncludes(blocks, '/manifest.webmanifest', 'Cache-Control', ['no-cache', 'must-revalidate']);
  verifyPrivateDocumentCsp(blocks);

  return blocks.length;
}

if (!existsSync(redirectsPath)) {
  fail('Missing Cloudflare _redirects file');
} else {
  const redirects = readFileSync(redirectsPath, 'utf8');
  const rules = parseRules(redirects);
  const lastRule = rules.at(-1)?.line || '';
  let dynamicRules = 0;
  let sawDynamicRedirect = false;

  for (const { line, number } of rules) {
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      fail(`${redirectsPath}:${number} invalid redirect syntax`);
      continue;
    }

    const [source, destination, status] = parts;
    if (/^https?:\/\//i.test(source)) {
      fail(`${redirectsPath}:${number} uses a domain-level source; use Cloudflare Redirect Rules instead`);
    }
    if (source.endsWith('!') || destination.endsWith('!') || status?.endsWith('!')) {
      fail(`${redirectsPath}:${number} uses Netlify force syntax, unsupported by Cloudflare Pages`);
    }
    if (status && !['200', '301', '302', '303', '307', '308'].includes(status)) {
      fail(`${redirectsPath}:${number} unsupported status code ${status}`);
    }
    const isFallback = source === '/*' && destination === '/index.html' && status === '200';
    const isDynamic = source.includes(':') || source.includes('*');
    if (isDynamic) {
      dynamicRules += 1;
      if (!isFallback) sawDynamicRedirect = true;
    } else if (sawDynamicRedirect) {
      fail(`${redirectsPath}:${number} static redirects must appear before dynamic redirects`);
    }
  }

  if (lastRule !== '/* /index.html 200') {
    fail('SPA fallback must be the last _redirects rule: /* /index.html 200');
  }
  if (dynamicRules > 100) {
    fail(`Cloudflare Pages supports up to 100 dynamic _redirects rules; found ${dynamicRules}`);
  }

  if (!process.exitCode) {
    console.log(`Cloudflare redirects OK: ${rules.length} rules, ${dynamicRules} dynamic`);
  }
}

if (!existsSync(headersPath)) {
  fail('Missing Cloudflare _headers file');
} else {
  const headers = readFileSync(headersPath, 'utf8');
  const headerRuleCount = verifyHeaders(headers);
  if (!process.exitCode) {
    console.log(`Cloudflare headers OK: ${headersPath}, ${headerRuleCount} rules`);
  }
}
if (existsSync('dist/api')) {
  fail('dist/api must not be deployed on static hosts; legacy PHP API files belong outside public/');
}

const envConfigPath = existsSync('dist/env-config.js') ? 'dist/env-config.js' : 'public/env-config.js';
if (existsSync(envConfigPath)) {
  const envConfig = readFileSync(envConfigPath, 'utf8');
  const runtimeConfigAudit = collectPublicRuntimeConfigIssues(envConfig, {
    requireEnvConfig: true,
    requireSupabaseAnonKey: true,
  });

  for (const issue of runtimeConfigAudit.issues) {
    fail(`${envConfigPath} ${formatRuntimeConfigIssue(issue)}`);
  }

  if (runtimeConfigAudit.ok && !process.exitCode) {
    console.log(`Runtime public config OK: ${envConfigPath}`);
  }
}

const sitemapPath = 'dist/sitemap.xml';
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const overEncoded = sitemap.match(/<loc>[^<]*%25[^<]*<\/loc>/i);
  if (overEncoded) fail(`${sitemapPath} contains over-encoded URL ${overEncoded[0]}`);
  if (!process.exitCode) console.log('Cloudflare sitemap URL encoding OK');
}
const seoContentMapPath = 'dist/seo-content-map.json';
if (!existsSync(seoContentMapPath)) {
  fail('Missing dist/seo-content-map.json for edge SEO metadata');
} else {
  try {
    const seoContentMap = JSON.parse(readFileSync(seoContentMapPath, 'utf8'));
    const routes = Object.entries(seoContentMap?.routes || {}).filter(([, entry]) => entry?.title && entry?.description);
    if (routes.length < 300) fail(`${seoContentMapPath} contains too few dynamic routes: ${routes.length}`);
    if (!routes.some(([route]) => route.startsWith('/blog/'))) fail(`${seoContentMapPath} has no blog routes`);
    if (!routes.some(([route]) => route.startsWith('/actualites/'))) fail(`${seoContentMapPath} has no news routes`);
    if (!routes.some(([route]) => route.startsWith('/assurance-taxi-'))) fail(`${seoContentMapPath} has no city routes`);
    const shortDescription = routes.find(([, entry]) => String(entry.description || '').trim().length < 50);
    if (shortDescription) fail(`${seoContentMapPath} has a short description on ${shortDescription[0]}`);
    if (!process.exitCode) console.log(`Cloudflare SEO content map OK: ${routes.length} dynamic routes`);
  } catch (error) {
    fail(`${seoContentMapPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
const forbiddenDistSignatures = [
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_ADMIN_PASSWORD',
  'VITE_SMTP_PASSWORD',
  'VITE_SERP_API_KEY',
  'VITE_HCAPTCHA_SECRET_KEY',
  'VITE_OPENAI_API_KEY',
  'VITE_RESEND_API_KEY',
  'VITE_MAKE_SECRET',
  'VITE_MAKE_API_TOKEN',
  'TaxiAssur2025',
  'taxiassur2024',
  'change_me_secure_token_2024',
  'taxiassur_webhook_secret_2024',
];


function collectJsAssets(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const filePath = `${dir}/${entry}`;
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      files.push(...collectJsAssets(filePath));
      continue;
    }
    if (filePath.endsWith('.js')) {
      files.push(filePath.replace(/\\/g, '/'));
    }
  }

  return files;
}

function localStaticChunkImports(content) {
  const imports = new Set();
  const regex = /from\s*["']\.\/([^"']+\.js)["']/g;

  for (const match of content.matchAll(regex)) {
    imports.add(match[1]);
  }

  return [...imports];
}

function findGraphCycle(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      return stack.slice(start).concat(node);
    }
    if (visited.has(node)) return null;

    visiting.add(node);
    stack.push(node);

    for (const dependency of graph.get(node) || []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }

  return null;
}

function isCriticalSharedChunk(name) {
  return /^(vendor|lib-)/.test(name);
}

function verifyChunkGraph(dir) {
  const files = collectJsAssets(dir);
  if (files.length === 0) return;

  const knownChunks = new Set(files.map((file) => file.split('/').at(-1)));
  const graph = new Map();
  let largest = { file: '', bytes: 0 };

  for (const file of files) {
    const name = file.split('/').at(-1);
    const size = statSync(file).size;
    if (size > largest.bytes) largest = { file: name, bytes: size };
    if (size > MAX_JS_CHUNK_BYTES) {
      fail(`${file} is ${(size / 1024).toFixed(1)} KiB, above MAX_JS_CHUNK_BYTES ${(MAX_JS_CHUNK_BYTES / 1024).toFixed(1)} KiB`);
    }

    const content = readFileSync(file, 'utf8');
    const imports = localStaticChunkImports(content).filter((target) => knownChunks.has(target));
    graph.set(name, imports);
  }

  const criticalGraph = new Map();
  for (const [name, imports] of graph) {
    if (!isCriticalSharedChunk(name)) continue;
    criticalGraph.set(name, imports.filter(isCriticalSharedChunk));
  }

  const cycle = findGraphCycle(criticalGraph);
  if (cycle) {
    fail(`Critical JavaScript chunk import cycle detected: ${cycle.join(' -> ')}`);
  } else if (!process.exitCode) {
    console.log(`Cloudflare critical chunk graph OK: ${files.length} JS chunks, largest ${largest.file} ${(largest.bytes / 1024).toFixed(1)} KiB`);
  }
}
function scanBuiltFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const signature of forbiddenDistSignatures) {
    if (content.includes(signature)) {
      fail(`${path} contains forbidden client-side secret signature ${signature}`);
    }
  }
}

function scanBuiltDirectory(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      scanBuiltDirectory(path);
      continue;
    }
    if (/\.(js|html|json|txt|xml|css)$/.test(path)) {
      scanBuiltFile(path);
    }
  }
}

scanBuiltDirectory('dist');
verifyChunkGraph('dist/assets');
