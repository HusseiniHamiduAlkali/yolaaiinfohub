function buildPasswordResetFallbackResponse({
  resetUrl,
  lastResetLink,
  includeResetInResponse,
  isProduction,
  messageOverride
} = {}) {
  const fallbackMessage = messageOverride || (
    isProduction
      ? 'Password reset request received. Email delivery is not configured in this environment, so the reset link has been logged for follow-up.'
      : 'Password reset link generated. Email sending is not configured on the server; check server logs for the reset link.'
  );

  const response = {
    success: true,
    message: fallbackMessage
  };

  if (includeResetInResponse && (lastResetLink || resetUrl)) {
    response.resetLink = lastResetLink || resetUrl;
  }

  return response;
}

module.exports = {
  buildPasswordResetFallbackResponse
};
