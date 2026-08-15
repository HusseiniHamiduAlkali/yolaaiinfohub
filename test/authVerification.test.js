const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getEmailVerificationError,
  getVerificationReminderMessage,
  normalizeEmailIdentifier,
  getUserLookupQuery,
  isEmailVerificationRequiredResponse,
  getVerificationErrorMessage
} = require('../server/authVerification');
const { buildPasswordResetFallbackResponse } = require('../server/passwordResetUtils');

test('blocks local accounts that are not email verified', () => {
  const result = getEmailVerificationError({
    email: 'user@example.com',
    authProvider: 'local',
    emailVerified: false,
    password: 'hashed'
  });

  assert.ok(result);
  assert.equal(result.status, 403);
  assert.equal(result.requiresEmailVerification, true);
  assert.match(result.message, /verify your email/i);
});

test('allows verified local accounts', () => {
  const result = getEmailVerificationError({
    email: 'user@example.com',
    authProvider: 'local',
    emailVerified: true,
    password: 'hashed'
  });

  assert.equal(result, null);
});

test('allows google-authenticated accounts without blocking', () => {
  const result = getEmailVerificationError({
    email: 'user@example.com',
    authProvider: 'google',
    emailVerified: false,
    password: 'hashed'
  });

  assert.equal(result, null);
});

test('returns a resend-verification message when sending a fresh email', () => {
  const result = getEmailVerificationError({
    email: 'user@example.com',
    authProvider: 'local',
    emailVerified: false,
    password: 'hashed'
  }, { resendVerification: true });

  assert.ok(result);
  assert.equal(result.status, 403);
  assert.equal(result.requiresEmailVerification, true);
  assert.match(result.message, /new verification email has been sent/i);
  assert.match(getVerificationReminderMessage({ email: 'user@example.com', resendVerification: true }), /new verification email has been sent/i);
});

test('normalizes email identifiers before login verification checks', () => {
  const normalized = normalizeEmailIdentifier(' HUSSEINI@GMAIL.COM ');
  assert.equal(normalized, 'husseini@gmail.com');

  const lookupQuery = getUserLookupQuery({ email: 'HUSSEINI@GMAIL.COM' });
  assert.deepEqual(lookupQuery, { email: 'husseini@gmail.com' });

  const result = getEmailVerificationError({
    email: normalized,
    authProvider: 'local',
    emailVerified: false,
    password: 'hashed'
  });

  assert.ok(result);
  assert.equal(result.status, 403);
  assert.equal(result.requiresEmailVerification, true);
});

test('treats generic verification error payloads as a verification reminder', () => {
  const response = {
    success: false,
    error: 'Please verify your email before signing in. Check your inbox for the verification link or code.',
    requiresEmailVerification: false
  };

  assert.equal(isEmailVerificationRequiredResponse(response), true);
  assert.match(getVerificationErrorMessage(response), /verify your email/i);
});

test('keeps production password reset requests successful when email delivery is disabled', () => {
  const result = buildPasswordResetFallbackResponse({
    resetUrl: 'https://example.com/pages/reset-password.html?token=abc&email=test@example.com',
    lastResetLink: 'https://example.com/pages/reset-password.html?token=abc&email=test@example.com',
    includeResetInResponse: true,
    isProduction: true
  });

  assert.equal(result.success, true);
  assert.match(result.message, /not configured|follow-up/i);
  assert.equal(result.resetLink, 'https://example.com/pages/reset-password.html?token=abc&email=test@example.com');
});

test('generates Gmail dot-stripped candidates for resilient user lookups', () => {
  const { getEmailLookupCandidates } = require('../server/authVerification');
  const candidates = getEmailLookupCandidates('john.doe@gmail.com');
  assert.ok(candidates.includes('john.doe@gmail.com'));
  assert.ok(candidates.includes('johndoe@gmail.com'));

  const nonGmail = getEmailLookupCandidates('john.doe@example.com');
  assert.deepEqual(nonGmail, ['john.doe@example.com']);
});

test('builds multi-field user lookup query for identifier or usernameOrEmail', () => {
  const queryByIdentifier = getUserLookupQuery({ identifier: 'user@example.com' });
  assert.ok(queryByIdentifier.$or);
  assert.ok(queryByIdentifier.$or.some(cond => cond.email === 'user@example.com'));

  const queryByUsername = getUserLookupQuery({ usernameOrEmail: 'johnny' });
  assert.ok(queryByUsername.$or);
  assert.ok(queryByUsername.$or.some(cond => cond.username === 'johnny'));
});
