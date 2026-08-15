function getVerificationReminderMessage({ email, resendVerification = false } = {}) {
  const address = email ? ` to ${email}` : '';

  if (resendVerification) {
    return `Your email is not verified yet. A new verification email has been sent${address}. Please check your inbox and verify before signing in again.`;
  }

  return 'Please verify your email before signing in. Check your inbox for the verification link or code.';
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
  getEmailVerificationError,
  getVerificationReminderMessage
};
