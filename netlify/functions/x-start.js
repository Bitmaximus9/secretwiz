export const handler = async () => {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = `${process.env.SITE_URL}/auth/x/callback`;
  const state = Math.random().toString(36).slice(2);
  const codeVerifier = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const codeChallenge = Buffer.from(codeVerifier).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'users.read tweet.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://twitter.com/i/oauth2/authorize?${params}`,
      'Set-Cookie': `x_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  };
};
