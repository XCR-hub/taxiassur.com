#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));

const projectRef = process.env.SUPABASE_PROJECT_REF || "drohhxrkoequjphvabvq";
const boltWebhook =
  process.env.BOLT_REBUILD_WEBHOOK_URL ||
  "https://api.bolt.new/v1/deploy/github-mcmcpmfr";
const netlifyBuildHook =
  process.env.NETLIFY_BUILD_HOOK_URL ||
  process.env.NETLIFY_DEPLOY_HOOK_URL ||
  "";
const netlifySiteId = process.env.NETLIFY_SITE_ID || "9719283a-c221-4e19-8a78-72e75e0f7393";

const supabaseFunctions = [
  "send-email-ionos",
  "send-lead-notification",
  "process-lead-queue",
  "send-client-access",
  "process-client-access-outbox",
  "process-insurer-dossier-sends",
  "send-document-notification",
  "send-email-universal",
  "send-payment-link-email",
  "send-quote-email",
  "send-newsletter-universal",
  "fetch-email-replies",
  "sync-ionos-imap",
  "sync-ionos-imap-v2",
  "sync-ionos-imap-documents",
  "notify-claim",
];

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const commitMessage = args.find((arg) => !arg.startsWith("--")) || process.env.PUBLISH_COMMIT_MESSAGE || "";

const skipGit = flags.has("--skip-git");
const withBolt = flags.has("--with-bolt") || process.env.PUBLISH_WITH_BOLT === "1";
const skipBolt = flags.has("--skip-bolt") || !withBolt;
const withNetlify = flags.has("--netlify") || process.env.PUBLISH_WITH_NETLIFY === "1";
const skipNetlify = flags.has("--skip-netlify") || !withNetlify;
const skipSupabase = flags.has("--skip-supabase");
const withCloudflare = flags.has("--cloudflare") || process.env.PUBLISH_WITH_CLOUDFLARE === "1";
const withVercel = flags.has("--vercel") || process.env.PUBLISH_WITH_VERCEL === "1";
const skipVercel = flags.has("--skip-vercel") || !withVercel;
const vercelSkipDomain = flags.has("--vercel-skip-domain") || process.env.VERCEL_SKIP_DOMAIN === "1";
const dryRun = flags.has("--dry-run");

function log(message) {
  console.log(message);
}

function run(command, commandArgs, options = {}) {
  const printable = [command, ...commandArgs].join(" ");
  if (!options.quiet) log(`> ${printable}`);
  if (dryRun) return { status: 0, stdout: "", stderr: "" };

  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`Command failed: ${printable}`);
  }

  return {
    status: result.status || 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCmd() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function vercelCmd() {
  return process.platform === "win32" ? "vercel.cmd" : "vercel";
}

function git(args, options) {
  return run("git", ["-c", "safe.directory=C:/Users/TCERD/Documents/GitHub/taxiassur.com", ...args], options);
}

function buildAndVerify() {
  log("\n== Build ==");
  run(npmCmd(), ["run", "build"]);
}

function publishGit() {
  if (skipGit) {
    log("\n== Git skipped ==");
    return;
  }

  log("\n== Git ==");
  const status = git(["status", "--porcelain"], { capture: true, quiet: true }).stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.includes("supabase/.temp/"));

  if (status.length > 0) {
    if (!commitMessage) {
      throw new Error(
        "Uncommitted changes found. Pass a commit message, for example: npm run publish -- \"Update site\""
      );
    }
    git(["add", "-A"]);
    git(["-c", "core.hooksPath=NUL", "commit", "--no-verify", "-m", commitMessage]);
  } else {
    log("No local changes to commit.");
  }

  git(["push", "origin", "main"]);
}

function hasSupabaseAuth() {
  return Boolean(process.env.SUPABASE_ACCESS_TOKEN);
}

function writeSupabaseEnvFile() {
  const smtpPass = process.env.SMTP_PASS || process.env.HMAIL_SMTP_PASS || "";
  const imapPass = process.env.IMAP_PASS || process.env.HMAIL_IMAP_PASS || smtpPass;

  if (!smtpPass && !imapPass) return null;

  const lines = [
    "SMTP_HOST=mail.xcr.fr",
    "SMTP_PORT=587",
    "SMTP_SECURITY=starttls",
    "SMTP_USER=tcerda@xcr.fr",
    smtpPass ? `SMTP_PASS=${smtpPass}` : "",
    "FROM_EMAIL=tcerda@xcr.fr",
    "REPLY_TO_EMAIL=team@taxiassur.com",
    "IMAP_HOST=mail.xcr.fr",
    "IMAP_PORT=993",
    "IMAP_USER=tcerda@xcr.fr",
    imapPass ? `IMAP_PASS=${imapPass}` : "",
    "IONOS_SMTP_HOST=mail.xcr.fr",
    "IONOS_SMTP_PORT=587",
    "IONOS_SMTP_SECURITY=starttls",
    "IONOS_SMTP_USER=tcerda@xcr.fr",
    "IONOS_EMAIL_USER=tcerda@xcr.fr",
    smtpPass ? `IONOS_EMAIL_PASSWORD=${smtpPass}` : "",
    smtpPass ? `IONOS_SMTP_PASSWORD=${smtpPass}` : "",
    "IONOS_IMAP_HOST=mail.xcr.fr",
    "IONOS_IMAP_PORT=993",
    "IONOS_IMAP_USER=tcerda@xcr.fr",
    imapPass ? `IONOS_IMAP_PASSWORD=${imapPass}` : "",
    withBolt ? `BOLT_REBUILD_WEBHOOK_URL=${boltWebhook}` : "",
  ].filter(Boolean);

  const dir = join(tmpdir(), "taxiassur-publish");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `supabase-secrets-${Date.now()}.env`);
  writeFileSync(file, `${lines.join("\n")}\n`, { mode: 0o600 });
  return file;
}

function publishSupabase() {
  if (skipSupabase) {
    log("\n== Supabase skipped ==");
    return;
  }

  log("\n== Supabase ==");
  if (!hasSupabaseAuth()) {
    log("Skipped: SUPABASE_ACCESS_TOKEN is not set.");
    log("Set it first, then rerun: npm run publish -- --skip-git --skip-bolt");
    return;
  }

  const envFile = writeSupabaseEnvFile();
  try {
    if (envFile) {
      run(npmCmd(), [
        "exec",
        "supabase",
        "--",
        "secrets",
        "set",
        "--project-ref",
        projectRef,
        "--env-file",
        envFile,
      ]);
      log("Supabase hMail secrets updated.");
    } else {
      log("SMTP_PASS/IMAP_PASS not set: secrets were not changed.");
    }

    for (const fn of supabaseFunctions) {
      run(npmCmd(), [
        "exec",
        "supabase",
        "--",
        "functions",
        "deploy",
        fn,
        "--project-ref",
        projectRef,
      ]);
    }
  } finally {
    if (envFile && existsSync(envFile)) {
      try {
        unlinkSync(envFile);
      } catch {
        log(`Warning: temporary secret file not removed: ${envFile}`);
      }
    }
  }
}

async function triggerBolt() {
  if (skipBolt) {
    log("\n== Bolt skipped ==");
    if (!flags.has("--skip-bolt")) {
      log("Independent publish mode is enabled by default. Pass --with-bolt only for the legacy Bolt workflow.");
    }
    return;
  }

  log("\n== Bolt webhook ==");
  try {
    const response = await fetch(boltWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "taxiassur-local-publish",
        trigger: "manual",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log(`Bolt webhook failed: HTTP ${response.status} ${body}`);
      return;
    }

    log("Bolt webhook triggered.");
  } catch (error) {
    log(`Bolt webhook unavailable: ${error.message}`);
  }
}

async function triggerNetlify() {
  if (skipNetlify) {
    log("\n== Netlify skipped ==");
    return;
  }

  log("\n== Netlify ==");
  if (!netlifyBuildHook) {
    run(npxCmd(), [
      "--yes",
      "netlify-cli",
      "deploy",
      "--prod",
      "--no-build",
      "--dir",
      "dist",
      "--site",
      netlifySiteId,
      "--message",
      `TaxiAssur publish ${new Date().toISOString()}`,
    ]);
    return;
  }

  try {
    const response = await fetch(netlifyBuildHook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "taxiassur-local-publish",
        trigger: "manual",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log(`Netlify build hook failed: HTTP ${response.status} ${body}`);
      return;
    }

    log("Netlify build hook triggered.");
  } catch (error) {
    log(`Netlify build hook unavailable: ${error.message}`);
  }
}

function announceCloudflarePrimary() {
  log("\n== Cloudflare Pages ==");
  if (withCloudflare) {
    log("Primary deployment path: git push to main triggers .github/workflows/deploy-cloudflare-pages.yml.");
    log("For a direct local deploy with Cloudflare credentials, run: npm run deploy:cloudflare:prod");
  } else {
    log("Primary deployment path is Cloudflare Pages via GitHub Actions; Netlify/Vercel legacy deploys are skipped by default.");
  }
}

function publishVercel() {
  if (skipVercel) {
    log("\n== Vercel skipped ==");
    if (!flags.has("--skip-vercel")) {
      log("Pass --vercel to publish the current project to the linked Vercel project.");
    }
    return;
  }

  log("\n== Vercel ==");
  const args = ["deploy", "--prod", "--yes"];
  if (vercelSkipDomain) args.push("--skip-domain");
  run(vercelCmd(), args);
}

async function verifyPublicSite() {
  log("\n== Public site ==");
  try {
    const response = await fetch("https://taxiassur.com", { method: "HEAD" });
    log(`taxiassur.com: HTTP ${response.status}`);
    const server = response.headers.get("server");
    if (server) log(`server: ${server}`);
  } catch (error) {
    log(`Public site check unavailable: ${error.message}`);
  }
}

async function main() {
  log("TaxiAssur publish");
  log(`Project ref: ${projectRef}`);

  buildAndVerify();
  publishGit();
  announceCloudflarePrimary();
  await triggerNetlify();
  publishVercel();
  await triggerBolt();
  publishSupabase();
  await verifyPublicSite();

  log("\nPublish command finished.");
}

main().catch((error) => {
  console.error(`\nPublish failed: ${error.message}`);
  process.exit(1);
});
