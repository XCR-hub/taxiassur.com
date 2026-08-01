#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const reportPath = process.env.DEPLOYMENT_INDEPENDENCE_REPORT || '';
const checks = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
}

function packageJson() {
  return JSON.parse(read('package.json'));
}

function workflowFiles() {
  const dir = path.join(root, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /\.ya?ml$/i.test(file))
    .map((file) => path.join('.github', 'workflows', file));
}

function verifyPackageScripts() {
  const pkg = packageJson();
  const scripts = pkg.scripts || {};

  addCheck('Cloudflare production deploy script exists', /wrangler pages deploy dist --project-name taxiassur --branch main/.test(scripts['deploy:cloudflare:prod'] || ''), {
    script: 'deploy:cloudflare:prod',
  });
  addCheck('Cloudflare publish alias exists', /--cloudflare/.test(scripts['publish:cloudflare'] || ''), {
    script: 'publish:cloudflare',
  });
  addCheck('independent publish uses Cloudflare, not Vercel', /--cloudflare/.test(scripts['publish:independent'] || '') && !/--vercel|vercel/i.test(scripts['publish:independent'] || ''), {
    value: scripts['publish:independent'] || null,
  });

  const forbiddenPrimaryScripts = Object.entries(scripts).filter(([name, value]) => {
    if (/^(cloudflare:ai-robots|secrets:list)$/i.test(name)) return false;
    return /vercel|netlify/i.test(name) || /\bvercel\b|netlify-cli|--vercel|--netlify/i.test(String(value));
  });

  addCheck('package scripts expose no Vercel/Netlify primary publish path', forbiddenPrimaryScripts.length === 0, {
    forbidden: forbiddenPrimaryScripts.map(([name, value]) => ({ name, value })),
  });
}

function verifyPublishDefaults() {
  const source = read('scripts/publish.js');
  addCheck('publish.js skips Netlify unless explicitly requested', source.includes('const skipNetlify = flags.has("--skip-netlify") || !withNetlify'), {
    file: 'scripts/publish.js',
  });
  addCheck('publish.js skips Vercel unless explicitly requested', source.includes('const skipVercel = flags.has("--skip-vercel") || !withVercel'), {
    file: 'scripts/publish.js',
  });
  addCheck('publish.js announces Cloudflare Pages as primary path', source.includes('Primary deployment path') && source.includes('deploy-cloudflare-pages.yml'), {
    file: 'scripts/publish.js',
  });
}

function verifyWorkflows() {
  const files = workflowFiles();
  addCheck('Cloudflare Pages workflow exists', files.includes(path.join('.github', 'workflows', 'deploy-cloudflare-pages.yml')), {
    files,
  });

  const deployWorkflow = read('.github/workflows/deploy-cloudflare-pages.yml');
  addCheck('production workflow deploys with Cloudflare Pages', deployWorkflow.includes('cloudflare/wrangler-action') && deployWorkflow.includes('pages deploy dist --project-name taxiassur --branch main'), {
    file: '.github/workflows/deploy-cloudflare-pages.yml',
  });
  addCheck('production workflow fails when Cloudflare secrets are missing', deployWorkflow.includes('::error::Cloudflare deployment is not configured') && deployWorkflow.includes('exit 1') && !deployWorkflow.includes('Cloudflare deploy skipped'), {
    file: '.github/workflows/deploy-cloudflare-pages.yml',
  });
  addCheck('production workflow runs deployment independence guard', deployWorkflow.includes('npm run verify:deployment-independence'), {
    file: '.github/workflows/deploy-cloudflare-pages.yml',
  });

  const forbidden = [];
  for (const file of files) {
    const source = read(file);
    if (/vercel|netlify-cli|NETLIFY_|deploy_netlify/i.test(source)) {
      forbidden.push(file);
    }
  }

  addCheck('GitHub workflows contain no Vercel/Netlify deploy path', forbidden.length === 0, { forbidden });
}

function main() {
  verifyPackageScripts();
  verifyPublishDefaults();
  verifyWorkflows();

  const report = {
    ok: checks.every((check) => check.ok),
    checked_at: new Date().toISOString(),
    checks,
  };

  if (reportPath) {
    mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main();