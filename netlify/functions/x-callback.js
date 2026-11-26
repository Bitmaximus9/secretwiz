import { cookie, getConfig, matches, readCookie, redirect, signSession } from '../lib/x-oauth.mjs';

export const handler = async (event) => {
  const config = getConfig();
  const { code, error, state } = event.queryStringParameters || {};
  const [expectedState, verifier] = (readCookie(event, 'x_oauth') || '').split('.');
  const clearAttempt = cookie('x_oauth', '', 0);
  const finish = (result) => redirect('/?x=' + result, [clearAttempt]);
  if (!config) return finish('unavailable');
  if (!verifier || !matches(state, expectedState)) return finish('failed');
  if (error === 'access_denied') return finish('cancelled');
  if (error || !code) return finish('failed');

  try {
    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) {
      console.warn('X token exchange failed with HTTP status', tokenRes.status);
      return finish('failed');
    }

    const { access_token: accessToken } = await tokenRes.json();
    if (typeof accessToken !== 'string' || !accessToken) return finish('failed');
    const userRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      console.warn('X profile request failed with HTTP status', userRes.status);
      return finish('failed');
    }
    const { data } = await userRes.json();
    if (typeof data?.id !== 'string' || !/^[0-9]{1,20}$/.test(data.id) ||
        typeof data?.username !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(data.username)) {
      return finish('failed');
    }
    const maxAge = 86400;
    const expires = Math.floor(Date.now() / 1000) + maxAge;
    return redirect('/?x=connected', [
      cookie('x_session', signSession(data, config.clientSecret, expires), maxAge),
      clearAttempt,
    ]);
  } catch {
    console.warn('X OAuth request could not be completed');
    return finish('failed');
  }
};
