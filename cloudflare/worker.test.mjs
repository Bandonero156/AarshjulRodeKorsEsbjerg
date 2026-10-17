import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test' };
const b64 = input => Buffer.from(input).toString('base64url');
const env = { ACCESS_TEAM_DOMAIN: 'aarshjul-test.cloudflareaccess.com', ACCESS_AUD: 'test-audience',
  SHEETS_MODE: 'published', ASSETS: { fetch: async () => new Response('app shell') } };
async function token(overrides = {}) {
  const input = `${b64(JSON.stringify({ alg: 'RS256', kid: 'test' }))}.${b64(JSON.stringify({
    iss: `https://${env.ACCESS_TEAM_DOMAIN}`, aud: [env.ACCESS_AUD], sub: 'test-user', exp: Date.now() / 1000 + 60, ...overrides
  }))}`;
  return `${input}.${b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input)))}`;
}
const realFetch = globalThis.fetch;
let sheetReads = 0;
globalThis.fetch = async (url, options) => {
  if (String(url).endsWith('/cdn-cgi/access/certs')) return Response.json({ keys: [jwk] });
  if (String(url).startsWith('https://docs.google.com/')) {
    sheetReads++;
    return new Response('År,Måned,Dato,Aktivitet,Kategori,Beskrivelse,Ansvarlig,Vis\n2027,Januar,1-1-2027,Test,Møde,,,Ja');
  }
  return realFetch(url, options);
};
async function call(path = '/', jwt, settings = env, method = 'GET') {
  return worker.fetch(new Request(`https://test.pages.dev${path}`, { method, headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} }), settings);
}
test('all routes fail closed without Access configuration or valid signed assertion', async () => {
  for (const path of ['/', '/script.js', '/api/events.csv', '/manifest.webmanifest', '/icons/icon-192.png']) {
    assert.equal((await call(path)).status, 403);
    assert.equal((await call(path, await token(), {})).status, 403);
  }
  assert.equal(sheetReads, 0);
});
test('reject expiry, wrong audience/issuer and altered signature', async () => {
  for (const claims of [{ exp: 1 }, { aud: ['other'] }, { iss: 'https://evil.example' }, { nbf: Date.now() / 1000 + 300 }]) {
    assert.equal((await call('/', await token(claims))).status, 403);
  }
  const forged = (await token()).split('.');
  forged[2] = Buffer.alloc(256).toString('base64url');
  assert.equal((await call('/', forged.join('.'))).status, 403);
});
test('authenticated shell and CSV work with no-store; unsupported APIs stay disabled', async () => {
  const jwt = await token();
  const shell = await call('/', jwt);
  assert.equal(await shell.text(), 'app shell');
  assert.equal(shell.headers.get('cache-control'), 'private, no-store');
  const response = await call('/api/events.csv', jwt);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /2027,Januar/);
  assert.match(response.headers.get('content-type'), /text\/csv/);
  assert.equal((await call('/api/push/subscribe', jwt, env, 'POST')).status, 405);
  assert.equal((await call('/api/unknown', jwt)).status, 404);
});
test('private mode never silently falls back to public CSV', async () => {
  const before = sheetReads;
  assert.equal((await call('/api/events.csv', await token(), { ...env, SHEETS_MODE: 'private' })).status, 502);
  assert.equal(sheetReads, before);
});
test('upstream HTML/error returns 502 without leaking upstream data', async () => {
  globalThis.fetch = async () => new Response('<html>Google error containing details</html>');
  const response = await call('/api/events.csv', await token());
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /Google error/);
});
