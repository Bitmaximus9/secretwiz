import { createHmac, timingSafeEqual } from 'node:crypto';

export function getConfig() {
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  try {
    const site = new URL(process.env.SITE_URL?.trim() || process.env.URL);
    if (!clientId || !clientSecret || site.protocol !== 'https:' ||
        site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
      return null;
    }
    return { clientId, clientSecret, redirectUri: site.origin + '/auth/x/callback' };
  } catch {
    return null;
  }
}

export function readCookie(event, name) {
  const cookies = event.headers?.cookie || event.headers?.Cookie || '';
  return cookies.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
}

export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function matches(first, second) {
  return typeof first === 'string' && typeof second === 'string' &&
    Buffer.byteLength(first) === Buffer.byteLength(second) &&
    timingSafeEqual(Buffer.from(first), Buffer.from(second));
}

export function signSession({ id, username }, secret, expires) {
  const payload = `${id}.${username}.${expires}`;
  const signature = createHmac('sha256', secret).update('secretwiz-x-v2:' + payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSession(event, secret) {
  const raw = readCookie(event, 'x_session') || '';
  const [id, username, expires] = raw.split('.');
  if (!/^[0-9]{1,20}$/.test(id) || !/^[A-Za-z0-9_]{1,15}$/.test(username) ||
      !/^[0-9]{1,12}$/.test(expires) || Number(expires) <= Date.now() / 1000) return null;
  const identity = { id, username };
  return matches(raw, signSession(identity, secret, expires)) ? identity : null;
}

export function redirect(location, cookies = []) {
  return {
    statusCode: 302,
    headers: { Location: location, 'Cache-Control': 'no-store' },
    ...(cookies.length && { multiValueHeaders: { 'Set-Cookie': cookies } }),
  };
}
