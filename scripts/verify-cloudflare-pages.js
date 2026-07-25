#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

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
} else if (!process.exitCode) {
  console.log(`Cloudflare headers OK: ${headersPath}`);
}
if (existsSync('dist/api')) {
  fail('dist/api must not be deployed on static hosts; legacy PHP API files belong outside public/');
}

const envConfigPath = existsSync('dist/env-config.js') ? 'dist/env-config.js' : 'public/env-config.js';
if (existsSync(envConfigPath)) {
  const envConfig = readFileSync(envConfigPath, 'utf8');
  const forbiddenPublicKeys = [
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_OPENAI_API_KEY',
    'VITE_RESEND_API_KEY',
    'VITE_SMTP_PASSWORD',
    'VITE_SERP_API_KEY',
    'VITE_ADMIN_PASSWORD',
    'VITE_HCAPTCHA_SECRET_KEY',
    'VITE_MAKE_API_TOKEN',
    'VITE_MAKE_SECRET',
  ];

  for (const key of forbiddenPublicKeys) {
    if (envConfig.includes(key)) {
      fail(`${envConfigPath} exposes forbidden browser key ${key}`);
    }
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