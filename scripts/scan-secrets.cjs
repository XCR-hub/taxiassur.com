#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const placeholder = /REDACTED|YOUR_|PLACEHOLDER|EXEMPLE|EXAMPLE|\$|\.replace|match\(|includes\(/i;

const secretPatterns = [
  { name: 'OpenAI API key', regex: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Anthropic API key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'OpenRouter API key', regex: /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Brevo API key', regex: /\bxkeysib-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'SendGrid API key', regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
  { name: 'HuggingFace API key', regex: /\bhf_[A-Za-z0-9]{20,}\b/g },
  { name: 'Pinterest token', regex: /\bpina_[A-Za-z0-9_]{20,}\b/g },
  { name: 'Google OAuth secret', regex: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Supabase personal token', regex: /\bsbp_[A-Za-z0-9]{20,}\b/g },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g, ignore: placeholder },
  { name: 'GitHub classic token', regex: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { name: 'GitHub fine-grained token', regex: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
  { name: 'Cloudflare user token', regex: /\bcfut_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Twilio auth token assignment', regex: /^\s*TWILIO_AUTH_TOKEN\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}["']?\s*$/gm, ignore: placeholder },
  { name: 'Monetico MAC key assignment', regex: /^\s*MONETICO_MAC_KEY\s*[:=]\s*["']?[A-Fa-f0-9]{24,}["']?\s*$/gm, ignore: placeholder },
  { name: 'Make API token assignment', regex: /^\s*MAKE_API_TOKEN\s*[:=]\s*["']?[0-9a-fA-F-]{24,}["']?\s*$/gm, ignore: placeholder },
  { name: 'IONOS password assignment', regex: /^\s*IONOS_[A-Z0-9_]*PASSWORD\s*[:=]\s*["']?[^"'\s]{8,}["']?\s*$/gm, ignore: placeholder },
  { name: 'FTP password assignment', regex: /^\s*FTP_PASSWORD\s*[:=]\s*["']?[^"'\s]{8,}["']?\s*$/gm, ignore: placeholder },
];

const ignoredExtensions = new Set([
  '.avif', '.bmp', '.doc', '.docx', '.eot', '.gif', '.gz', '.ico', '.jpeg',
  '.jpg', '.mp3', '.mp4', '.otf', '.pdf', '.png', '.tar', '.tgz', '.ttf',
  '.webm', '.woff', '.woff2', '.zip',
]);

const ignoredPaths = new Set([
  'package-lock.json',
]);

function gitFiles() {
  return execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
}

function isSkipped(file) {
  const normalized = file.replace(/\\/g, '/');
  if (ignoredPaths.has(normalized)) return true;
  if (normalized.includes('/generated/')) return true;
  return ignoredExtensions.has(path.extname(normalized).toLowerCase());
}

function scanFile(file) {
  if (isSkipped(file)) return [];

  const absolutePath = path.join(root, file);
  const size = statSync(absolutePath).size;
  if (size > MAX_TEXT_FILE_BYTES) return [];

  const content = readFileSync(absolutePath, 'utf8');
  const findings = [];

  for (const { name, regex, ignore } of secretPatterns) {
    regex.lastIndex = 0;
    const matches = Array.from(content.matchAll(regex), (match) => match[0])
      .filter((match) => !ignore || !ignore.test(match));
    if (matches.length) {
      findings.push({ name, count: matches.length });
    }
  }

  return findings;
}

const results = [];

for (const file of gitFiles()) {
  const findings = scanFile(file);
  if (findings.length) {
    results.push({ file, findings });
  }
}

let total = 0;
for (const result of results) {
  total += result.findings.reduce((sum, finding) => sum + finding.count, 0);
}

if (results.length === 0) {
  console.log('Secret scan OK: no high-confidence tracked secrets found.');
  process.exit(0);
}

console.log(`Secret scan found ${total} high-confidence hit(s) in ${results.length} tracked file(s).`);
for (const result of results) {
  const summary = result.findings
    .map((finding) => `${finding.name}: ${finding.count}`)
    .join(', ');
  console.log(`- ${result.file} (${summary})`);
}

process.exit(1);

