const test = require('node:test');
const assert = require('node:assert/strict');
const { getEmailVerificationError } = require('../server/authVerification');
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
