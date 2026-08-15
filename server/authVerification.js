function escapeRegExp(string) {
  return String(string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmailIdentifier(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function getEmailLookupCandidates(emailStr) {
  const normalized = normalizeEmailIdentifier(emailStr);
  if (!normalized || !normalized.includes('@')) return [];
  const candidates = [normalized];
  const [local, domain] = normalized.split('@');
  if ((domain === 'gmail.com' || domain === 'googlemail.com') && local.includes('.')) {
    const noDots = local.replace(/\./g, '') + '@' + domain;
    if (!candidates.includes(noDots)) {
      candidates.push(noDots);
    }
  }
  return candidates;
}

function getUserLookupQuery({ email, username, identifier, usernameOrEmail } = {}) {
  // If only email is provided (common backwards-compatible path)
  if (email && !username && !identifier && !usernameOrEmail) {
    return { email: normalizeEmailIdentifier(email) };
  }

  // If only username is provided
  if (username && !email && !identifier && !usernameOrEmail) {
    return { username: String(username).trim() };
  }

  const raw = String(identifier || usernameOrEmail || email || username || '').trim();
  if (!raw) return {};

  const normalized = normalizeEmailIdentifier(raw);
  if (raw.includes('@')) {
    const candidates = getEmailLookupCandidates(raw);
    const conditions = candidates.map(cand => ({ email: cand }));
    conditions.push({ email: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } });
    conditions.push({ username: raw });
    return { $or: conditions };
  }

  return {
    $or: [
      { username: raw },
      { username: { $regex: `^${escapeRegExp(raw)}$`, $options: 'i' } },
      { email: normalized }
    ]
  };
}

function getVerificationReminderMessage({ email, resendVerification = false } = {}) {
  const address = email ? ` to ${email}` : '';

  if (resendVerification) {
    return `Your email is not verified yet. A new verification email has been sent${address}. Please check your inbox and verify before signing in again.`;
  }

  return 'Please verify your email before signing in. Check your inbox for the verification link or code.';
}

function isEmailVerificationRequiredResponse(payload = {}) {
  if (!payload || typeof payload !== 'object') return false;

  const normalizedMessage = String(payload.message || payload.error || '').toLowerCase();
  const requiresVerification = !!payload.requiresEmailVerification || payload.status === 403;

  if (requiresVerification) {
    return true;
  }

  return normalizedMessage.includes('verify your email') || normalizedMessage.includes('not verified yet');
}

function getVerificationErrorMessage(payload = {}, fallbackMessage = 'Please verify your email before signing in. Check your inbox for the verification link or code.') {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const explicit = payload.message || payload.error;
  if (explicit && (String(explicit).toLowerCase().includes('verify your email') || String(explicit).toLowerCase().includes('not verified yet'))) {
    return explicit;
  }

  return fallbackMessage;
}

function getEmailVerificationError(user, options = {}) {
  if (!user) return null;

  const isLocalAccount = user.authProvider === 'local' || !user.authProvider;
  const isVerified = !!user.emailVerified;

  if (isLocalAccount && !isVerified) {
    return {
      status: 403,
      requiresEmailVerification: true,
      message: getVerificationReminderMessage({
        email: user.email,
        resendVerification: !!options.resendVerification
      })
    };
  }

  return null;
}

module.exports = {
  escapeRegExp,
  getEmailLookupCandidates,
  getEmailVerificationError,
  getVerificationReminderMessage,
  isEmailVerificationRequiredResponse,
  getVerificationErrorMessage,
  normalizeEmailIdentifier,
  getUserLookupQuery
};
