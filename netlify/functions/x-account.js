import { getConfig, matches, readCookie, signedUsername } from '../lib/x-oauth.mjs';

export const handler = async (event) => {
  const config = getConfig();
  const session = readCookie(event, 'x_session') || '';
  const [username, expires] = session.split('.');
  const valid = config && /^[A-Za-z0-9_]{1,15}$/.test(username) &&
    Number(expires) > Date.now() / 1000 &&
    matches(session, signedUsername(username, config.clientSecret, expires));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ configured: Boolean(config), username: valid ? username : null }),
  };
};
