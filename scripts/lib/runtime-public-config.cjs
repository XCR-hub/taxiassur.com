const FORBIDDEN_PUBLIC_RUNTIME_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVER_KEY',
  'SUPABASE_SECRET_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVER_KEY',
  'VITE_SUPABASE_SECRET_KEY',
  'VITE_OPENAI_API_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_OPENROUTER_API_KEY',
  'VITE_GEMINI_API_KEY',
  'VITE_HUGGINGFACE_API_KEY',
  'VITE_RESEND_API_KEY',
  'VITE_BREVO_API_KEY',
  'VITE_SENDGRID_API_KEY',
  'VITE_SMTP_PASSWORD',
  'VITE_ADMIN_PASSWORD',
  'VITE_HCAPTCHA_SECRET_KEY',
  'VITE_TURNSTILE_SECRET_KEY',
  'VITE_RECAPTCHA_SECRET_KEY',
  'VITE_MAKE_API_TOKEN',
  'VITE_MAKE_SECRET',
  'VITE_TWILIO_AUTH_TOKEN',
  'VITE_MONETICO_MAC_KEY',
  'VITE_GOOGLE_CLIENT_SECRET',
  'VITE_GOOGLE_OAUTH_JSON',
  'VITE_GOOGLE_SEARCH_CONSOLE_CREDENTIALS',
  'VITE_LINKEDIN_CLIENT_SECRET',
  'VITE_LINKEDIN_ACCESS_TOKEN',
  'VITE_PINTEREST_ACCESS_TOKEN',
];

const SENSITIVE_VALUE_PATTERNS = [
  { name: 'Supabase server secret', regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Supabase personal token', regex: /\bsbp_[A-Za-z0-9]{20,}\b/ },
  { name: 'OpenAI API key', regex: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Anthropic API key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'OpenRouter API key', regex: /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Brevo API key', regex: /\bxkeysib-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'SendGrid API key', regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { name: 'HuggingFace API key', regex: /\bhf_[A-Za-z0-9]{20,}\b/ },
  { name: 'Pinterest token', regex: /\bpina_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Cloudflare user token', regex: /\bcfut_[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Google OAuth secret', regex: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRuntimeConfigValue(text, key) {
  const match = String(text || '').match(new RegExp(`${escapeRegExp(key)}\\s*:\\s*['\"]([^'\"]*)['\"]`));
  return match?.[1] || '';
}

function parseRuntimeConfigValues(text) {
  const values = {};
  const body = String(text || '');
  const regex = /([A-Z][A-Z0-9_]*)\s*:\s*['\"]([^'\"]*)['\"]/g;
  for (const match of body.matchAll(regex)) {
    values[match[1]] = match[2];
  }
  return values;
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function inspectSupabasePublicKey(key) {
  if (!key) return { ok: false, type: 'missing' };
  if (key.startsWith('sb_secret_')) return { ok: false, type: 'sb_secret' };
  if (key.startsWith('sb_publishable_')) return { ok: true, type: 'sb_publishable' };

  if (String(key).split('.').length === 3) {
    try {
      const payload = decodeJwtPayload(key);
      return {
        ok: payload?.role === 'anon',
        type: 'jwt',
        role: payload?.role || null,
      };
    } catch (error) {
      return { ok: false, type: 'jwt', error: error instanceof Error ? error.message : String(error) };
    }
  }

  return { ok: false, type: 'unknown' };
}

function collectPublicRuntimeConfigIssues(text, options = {}) {
  const source = String(text || '');
  const values = parseRuntimeConfigValues(source);
  const issues = [];
  const requireEnvConfig = options.requireEnvConfig !== false;
  const requireSupabaseAnonKey = options.requireSupabaseAnonKey !== false;

  if (requireEnvConfig && !source.includes('window.ENV_CONFIG')) {
    issues.push({ kind: 'missing_env_config', key: 'window.ENV_CONFIG' });
  }

  for (const key of FORBIDDEN_PUBLIC_RUNTIME_KEYS) {
    const keyPattern = new RegExp(`\\b${escapeRegExp(key)}\\b`);
    if (keyPattern.test(source)) {
      issues.push({ kind: 'forbidden_runtime_key', key });
    }
  }

  for (const [key, value] of Object.entries(values)) {
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(value)) {
        issues.push({ kind: 'sensitive_runtime_value', key, pattern: pattern.name });
      }
    }
  }

  const supabasePublicKey = inspectSupabasePublicKey(values.VITE_SUPABASE_ANON_KEY || '');
  if (!values.VITE_SUPABASE_ANON_KEY && requireSupabaseAnonKey) {
    issues.push({ kind: 'missing_public_supabase_key', key: 'VITE_SUPABASE_ANON_KEY' });
  } else if (values.VITE_SUPABASE_ANON_KEY && !supabasePublicKey.ok) {
    issues.push({ kind: 'unsafe_public_supabase_key', key: 'VITE_SUPABASE_ANON_KEY', type: supabasePublicKey.type, role: supabasePublicKey.role || null });
  }

  return {
    ok: issues.length === 0,
    issues,
    values,
    supabase_public_key: supabasePublicKey,
  };
}

function formatRuntimeConfigIssue(issue) {
  if (issue.kind === 'forbidden_runtime_key') return `exposes forbidden browser key ${issue.key}`;
  if (issue.kind === 'sensitive_runtime_value') return `exposes ${issue.pattern} in ${issue.key}`;
  if (issue.kind === 'unsafe_public_supabase_key') return `uses unsafe Supabase public key type ${issue.type}${issue.role ? ` (${issue.role})` : ''}`;
  if (issue.kind === 'missing_public_supabase_key') return `is missing ${issue.key}`;
  if (issue.kind === 'missing_env_config') return 'does not define window.ENV_CONFIG';
  return JSON.stringify(issue);
}

module.exports = {
  FORBIDDEN_PUBLIC_RUNTIME_KEYS,
  SENSITIVE_VALUE_PATTERNS,
  collectPublicRuntimeConfigIssues,
  formatRuntimeConfigIssue,
  inspectSupabasePublicKey,
  parseRuntimeConfigValues,
  readRuntimeConfigValue,
};