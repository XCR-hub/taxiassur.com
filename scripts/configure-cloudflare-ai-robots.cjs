#!/usr/bin/env node
const process = require('node:process');

const API_BASE = 'https://api.cloudflare.com/client/v4';
const args = new Set(process.argv.slice(2));
const SOFT = args.has('--soft');
const DRY_RUN = args.has('--dry-run');
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || 'taxiassur.com';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const PAGES_PROJECT = process.env.CLOUDFLARE_PAGES_PROJECT || 'taxiassur';
const TOKEN =
  process.env.CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN ||
  '';

function info(message) {
  console.log(`INFO - ${message}`);
}

function ok(message) {
  console.log(`OK  - ${message}`);
}

function warn(message) {
  console.warn(`WARN - ${message}`);
}

function escapeGitHubAnnotation(message) {
  return String(message)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function githubWarning(message) {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  console.warn(`::warning title=Cloudflare AI robots::${escapeGitHubAnnotation(message)}`);
}

function withActionableCloudflareGuidance(message) {
  if (/Cloudflare API (401|403) on .*\/bot_management/i.test(message) || /Authentication error/i.test(message)) {
    return `${message}. The current token can deploy Cloudflare Pages but cannot read or update Bot Management for ${ZONE_NAME}. Use a Cloudflare token scoped to this zone with Bot Management / AI crawler settings access and save it as CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN, or disable Cloudflare Managed robots.txt manually. Pages Write alone is not enough.`;
  }
  return message;
}

function formatCloudflareErrors(body) {
  if (!body || !Array.isArray(body.errors) || body.errors.length === 0) return '';
  return body.errors
    .map((error) => {
      const code = error.code ? `${error.code}: ` : '';
      return `${code}${error.message || 'Cloudflare API error'}`;
    })
    .join('; ');
}

async function cf(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { success: false, errors: [{ message: text.slice(0, 500) }] };
  }

  if (!response.ok || body.success === false) {
    const details = formatCloudflareErrors(body);
    const suffix = details ? ` - ${details}` : '';
    throw new Error(`Cloudflare API ${response.status} on ${path}${suffix}`);
  }

  return body.result;
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID) {
    info('zone resolved from CLOUDFLARE_ZONE_ID');
    return process.env.CLOUDFLARE_ZONE_ID;
  }

  if (ACCOUNT_ID) {
    try {
      const domains = await cf(
        `/accounts/${ACCOUNT_ID}/pages/projects/${encodeURIComponent(PAGES_PROJECT)}/domains`,
      );
      const candidates = Array.isArray(domains) ? domains : [];
      const exact = candidates.find((domain) => domain?.name === ZONE_NAME && domain?.zone_tag);
      const related = candidates.find(
        (domain) => domain?.name?.endsWith(`.${ZONE_NAME}`) && domain?.zone_tag,
      );
      const zoneTag = exact?.zone_tag || related?.zone_tag;
      if (zoneTag) {
        info('zone resolved from Cloudflare Pages custom domain zone_tag');
        return zoneTag;
      }
    } catch (error) {
      warn(`Cloudflare Pages domain zone lookup failed: ${error.message}`);
    }
  }

  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  if (!Array.isArray(zones) || zones.length === 0) {
    throw new Error(`Cloudflare zone not found: ${ZONE_NAME}`);
  }

  info('zone resolved from Cloudflare zone list');
  return zones[0].id;
}

function compactConfig(config) {
  return {
    is_robots_txt_managed: config?.is_robots_txt_managed,
    ai_bots_protection: config?.ai_bots_protection,
    cf_robots_variant: config?.cf_robots_variant,
    crawler_protection: config?.crawler_protection,
    content_bots_protection: config?.content_bots_protection,
    fight_mode: config?.fight_mode,
  };
}

async function main() {
  console.log('TaxiAssur Cloudflare AI robots configuration');

  if (!TOKEN) {
    throw new Error(
      'Missing CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN or CLOUDFLARE_API_TOKEN',
    );
  }

  const zoneId = await resolveZoneId();
  info(`zone ${ZONE_NAME} resolved`);

  const current = await cf(`/zones/${zoneId}/bot_management`);
  info(`current config ${JSON.stringify(compactConfig(current))}`);

  if (current.is_robots_txt_managed === false) {
    ok('Cloudflare Managed robots.txt is already disabled');
    return;
  }

  if (DRY_RUN) {
    warn('dry run: would set is_robots_txt_managed=false');
    return;
  }

  await cf(`/zones/${zoneId}/bot_management`, {
    method: 'PUT',
    body: JSON.stringify({ is_robots_txt_managed: false }),
  });

  const verified = await cf(`/zones/${zoneId}/bot_management`);
  if (verified.is_robots_txt_managed !== false) {
    throw new Error('Cloudflare accepted the request, but is_robots_txt_managed is still enabled');
  }

  ok('Cloudflare Managed robots.txt disabled');
}

main().catch((error) => {
  const rawMessage = error && error.message ? error.message : String(error);
  const message = withActionableCloudflareGuidance(rawMessage);
  if (SOFT) {
    if (/^Missing CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN/.test(rawMessage)) {
      info('Bot Management token not configured; keeping the dashboard setting unchanged');
      process.exit(0);
    }
    if (/Cloudflare API (401|403) on .*\/bot_management/i.test(rawMessage)) {
      info('Bot Management API access unavailable; keeping the verified dashboard setting unchanged');
      process.exit(0);
    }
    warn(message);
    githubWarning(message);
    warn('continuing because --soft is enabled');
    process.exit(0);
  }

  console.error(`ERR - ${message}`);
  process.exit(1);
});
