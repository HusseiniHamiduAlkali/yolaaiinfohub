function getEmailVerificationError(user) {
  if (!user) return null;

  const isLocalAccount = user.authProvider === 'local' || !user.authProvider;
  const isVerified = !!user.emailVerified;

  if (isLocalAccount && !isVerified) {
    return {
      status: 403,
      requiresEmailVerification: true,
      message: 'Please verify your email before signing in. Check your inbox for the verification link or code.'
    };
  }

  return null;
}

module.exports = {
  getEmailVerificationError
};
