import { getStore } from '@netlify/blobs';
import { getConfig, readSession } from '../lib/x-oauth.mjs';

const socialTasks = ['follow', 'repost', 'like'];
const textBodyLimit = 4096;

function reply(status, message) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async function submit(request) {
  if (request.method !== 'POST') return reply(405, 'Use the allowlist form to apply.');
  const config = getConfig();
  if (!config) return reply(503, 'X sign-in is temporarily unavailable.');
  const siteOrigin = new URL(config.redirectUri).origin;
  if (request.headers.get('origin') !== siteOrigin || new URL(request.url).origin !== siteOrigin) {
    return reply(403, 'Open SecretWiz directly to submit your application.');
  }
  const account = readSession({ headers: { cookie: request.headers.get('cookie') } }, config.clientSecret);
  if (!account) return reply(401, 'Connect your X account before submitting.');

  const raw = await request.text();
  if (raw.length > textBodyLimit) return reply(413, 'This application is too large.');
  const data = new URLSearchParams(raw);
  const wallet = data.get('wallet')?.trim() || '';
  if (!/^[A-Za-z0-9:_-]{20,300}$/.test(wallet)) {
    return reply(400, 'Enter a receiving address from your wallet.');
  }
  if (!socialTasks.every(task => data.get(task) === 'on') || data.get('agree') !== 'on') {
    return reply(400, 'Complete the three social tasks and agree to the registration terms.');
  }

  try {
    const store = getStore('verified-allowlist');
    const entry = {
      xUserId: account.id,
      handle: '@' + account.username,
      wallet,
      socialTasksConfirmed: socialTasks,
      termsVersion: '1',
      submittedAt: new Date().toISOString(),
    };
    const result = await store.setJSON(account.id, entry, { onlyIfNew: true });
    if (!result.modified) return reply(409, 'This X account already has an application.');
    return reply(201, 'Entry received. We will review it.');
  } catch {
    console.error('Failed to save a verified allowlist entry');
    return reply(503, 'Could not save your entry. Please try again.');
  }
}

export const config = { path: '/api/allowlist' };
