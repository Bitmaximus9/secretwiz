import { createHash, randomBytes } from 'node:crypto';
import { cookie, getConfig, redirect } from '../lib/x-oauth.mjs';

export const handler = async () => {
  const config = getConfig();
  if (!config) return redirect('/?x=unavailable');

  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'users.read tweet.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return redirect(`https://x.com/i/oauth2/authorize?${params}`, [
    cookie('x_oauth', `${state}.${verifier}`, 600),
  ]);
};
