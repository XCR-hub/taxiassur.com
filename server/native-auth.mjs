import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_VERSION = 1;
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export function hashPassword(password, options = {}) {
  assertPassword(password);
  const salt = options.salt || randomBytes(16).toString('base64url');
  const cost = positiveInt(options.cost, 16384);
  const blockSize = positiveInt(options.blockSize, 8);
  const parallelization = positiveInt(options.parallelization, 1);
  const keyLength = positiveInt(options.keyLength, 64);
  const key = scryptSync(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization });
  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt}$${key.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [scheme, rawCost, rawBlockSize, rawParallelization, salt, expected] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const cost = Number(rawCost);
  const blockSize = Number(rawBlockSize);
  const parallelization = Number(rawParallelization);
  if (![cost, blockSize, parallelization].every(Number.isSafeInteger)) return false;
  try {
    const expectedBuffer = Buffer.from(expected, 'base64url');
    const actual = scryptSync(password, salt, expectedBuffer.length, { N: cost, r: blockSize, p: parallelization });
    return safeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

export function createSession(profile, secret, options = {}) {
  assertSecret(secret);
  const now = positiveInt(options.now, Math.floor(Date.now() / 1000));
  const ttlSeconds = positiveInt(options.ttlSeconds, DEFAULT_TTL_SECONDS);
  const normalized = normalizeProfile(profile);
  const payload = {
    v: SESSION_VERSION,
    sub: normalized.id,
    email: normalized.email,
    name: normalized.name,
    role: normalized.role,
    jti: options.sessionId || randomBytes(18).toString('base64url'),
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token, secret, options = {}) {
  assertSecret(secret);
  if (typeof token !== 'string') return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra || !safeEqualText(signature, sign(body, secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = positiveInt(options.now, Math.floor(Date.now() / 1000));
    if (payload.v !== SESSION_VERSION || !payload.sub || !payload.email || !payload.jti) return null;
    if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
    if (payload.iat > now + 60 || payload.exp <= now) return null;
    if (options.revokedSessionIds?.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function stableUserId(email) {
  const normalized = normalizeEmail(email);
  const hex = createHash('sha256').update(`taxiassur-native-user:${normalized}`).digest('hex');
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new TypeError('profile_required');
  const email = normalizeEmail(profile.email);
  return {
    id: String(profile.id || stableUserId(email)),
    email,
    name: String(profile.name || email).trim().slice(0, 200),
    role: String(profile.role || 'admin').trim().slice(0, 50),
  };
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TypeError('invalid_email');
  return email;
}

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) {
    throw new TypeError('password_must_be_between_12_and_1024_characters');
  }
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new TypeError('session_secret_must_have_at_least_32_characters');
  }
}

function sign(body, secret) {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

function safeEqualText(left, right) {
  return safeEqual(Buffer.from(String(left)), Buffer.from(String(right)));
}

function safeEqual(left, right) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

