import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, hashPassword, stableUserId, verifyPassword, verifySession } from './native-auth.mjs';

const secret = 'a-secure-test-secret-with-more-than-32-characters';

test('password hashes verify without storing the password', () => {
  const encoded = hashPassword('A-strong-password-2026!', { salt: 'fixed-test-salt' });
  assert.equal(verifyPassword('A-strong-password-2026!', encoded), true);
  assert.equal(verifyPassword('wrong-password', encoded), false);
  assert.equal(encoded.includes('A-strong-password-2026!'), false);
});

test('sessions are signed, expire, and support revocation', () => {
  const token = createSession(
    { email: 'Admin@TaxiAssur.com', name: 'Admin', role: 'admin' },
    secret,
    { now: 1000, ttlSeconds: 300, sessionId: 'session-1' },
  );
  const active = verifySession(token, secret, { now: 1100 });
  assert.equal(active.email, 'admin@taxiassur.com');
  assert.equal(active.jti, 'session-1');
  assert.equal(verifySession(token, secret, { now: 1300 }), null);
  assert.equal(verifySession(token, secret, { now: 1100, revokedSessionIds: new Set(['session-1']) }), null);
});

test('tampered sessions are rejected', () => {
  const token = createSession({ email: 'admin@taxiassur.com' }, secret, { now: 1000 });
  assert.equal(verifySession(`${token}x`, secret, { now: 1001 }), null);
});

test('stable local user ids are normalized by email', () => {
  assert.equal(stableUserId(' Admin@TaxiAssur.com '), stableUserId('admin@taxiassur.com'));
});

