import { getConfig, readSession } from '../lib/x-oauth.mjs';

export const handler = async (event) => {
  const config = getConfig();
  const identity = config && readSession(event, config.clientSecret);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ configured: Boolean(config), username: identity?.username ?? null }),
  };
};
