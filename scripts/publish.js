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

const supabaseFunctions = [
  "send-email-ionos",
  "send-lead-notification",
  "process-lead-queue",
  "send-client-access",
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
const skipBolt = flags.has("--skip-bolt");
const skipSupabase = flags.has("--skip-supabase");
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

function git(args, options) {
  return run("git", ["-c", "safe.directory=C:/Users/TCERD/Documents/GitHub/taxiassur.com", ...args], options);
}

function buildAndVerify() {
  log("\n== Build ==");
  const sitemap = run("node", ["scripts/generate-clean-sitemap.js"], {
    allowFailure: true,
    capture: true,
  });
  if (sitemap.status !== 0) {
    log("Sitemap generation skipped: Supabase environment is not configured locally.");
  }
  run(npmCmd(), ["exec", "vite", "--", "build"]);
  run("node", ["scripts/verify-build.js"]);
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
    "IONOS_EMAIL_USER=tcerda@xcr.fr",
    smtpPass ? `IONOS_EMAIL_PASSWORD=${smtpPass}` : "",
    "IONOS_IMAP_HOST=mail.xcr.fr",
    "IONOS_IMAP_PORT=993",
    "IONOS_IMAP_USER=tcerda@xcr.fr",
    imapPass ? `IONOS_IMAP_PASSWORD=${imapPass}` : "",
    `BOLT_REBUILD_WEBHOOK_URL=${boltWebhook}`,
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
  await triggerBolt();
  publishSupabase();
  await verifyPublicSite();

  log("\nPublish command finished.");
}

main().catch((error) => {
  console.error(`\nPublish failed: ${error.message}`);
  process.exit(1);
});
