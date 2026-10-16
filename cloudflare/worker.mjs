const encoder = new TextEncoder();
const decoder = new TextDecoder();
const jwksCache = new Map();
let googleToken;
const SHEET_ID = '1w7Gkeg_Tg2HkJo4Tu131PyrLl8fcEnnP6AduGakmbTs';
const PUBLISHED_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Y683nr_IOWw2EjGRNiH7VVIWK7XdCrzjK0fXzeo6X-3uaJFCXl6htnCQ0VE5dmB97sCoJBMi1CU5/pub?gid=1691626216&single=true&output=csv';
const decode64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const encode64 = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const json64 = value => encode64(encoder.encode(JSON.stringify(value)));

function reply(body, status = 200, type = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: {
    'Content-Type': type, 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  }});
}

async function authenticated(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16000) return false;
  try {
    const [head, body, signature, extra] = token.split('.');
    if (!signature || extra !== undefined) return false;
    const header = JSON.parse(decoder.decode(decode64(head)));
    const claims = JSON.parse(decoder.decode(decode64(body)));
    const now = Date.now() / 1000;
    if (header.alg !== 'RS256' || claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}` ||
        !Number.isFinite(claims.exp) || claims.exp <= now ||
        (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) ||
        !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(env.ACCESS_AUD) ||
        typeof claims.sub !== 'string' || !claims.sub) return false;
    let cached = jwksCache.get(env.ACCESS_TEAM_DOMAIN);
    if (!cached || cached.until < Date.now()) {
      const result = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(10000) });
      if (!result.ok) return false;
      cached = { keys: (await result.json()).keys, until: Date.now() + 300000 };
      jwksCache.set(env.ACCESS_TEAM_DOMAIN, cached);
    }
    const jwk = cached.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode64(signature), encoder.encode(`${head}.${body}`));
  } catch { return false; }
}

async function accessToken(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const pem = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !pem) throw new Error('Google service account missing');
  if (googleToken?.email === email && googleToken.until > Date.now()) return googleToken.value;
  const now = Math.floor(Date.now() / 1000);
  const input = `${json64({ alg: 'RS256', typ: 'JWT' })}.${json64({ iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const der = decode64(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = encode64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(input)));
  const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }),
    signal: AbortSignal.timeout(15000) });
  if (!result.ok) throw new Error('Google token request failed');
  const data = await result.json();
  if (!data.access_token) throw new Error('Google token missing');
  googleToken = { email, value: data.access_token, until: Date.now() + Math.max(0, Math.min(Number(data.expires_in) || 0, 3600) - 60) * 1000 };
  return googleToken.value;
}

async function eventsCsv(env) {
  // Opt-in bridge only. The published Google URL remains public until separately disabled.
  if (env.SHEETS_MODE === 'published') {
    const response = await fetch(PUBLISHED_CSV, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Published sheet request failed');
    const csv = await response.text();
    if (!csv.split(/\r?\n/, 1)[0].includes('Aktivitet') || csv.trimStart().startsWith('<')) throw new Error('Invalid CSV');
    return csv;
  }
  const token = await accessToken(env);
  const range = encodeURIComponent("'Aktiviteter'!A:Z");
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Private sheet request failed');
  const { values } = await response.json();
  if (!values?.[0]?.includes('Aktivitet')) throw new Error('Invalid sheet headers');
  return values.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}

export default {
  async fetch(request, env) {
    if (!await authenticated(request, env)) return reply('Privat årshjul. Log ind via Cloudflare Access. Adgang er endnu ikke konfigureret, hvis denne besked bliver ved.', 403);
    const path = new URL(request.url).pathname;
    if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
    if (path === '/api/events.csv') {
      try { return reply(request.method === 'HEAD' ? null : await eventsCsv(env), 200, 'text/csv; charset=utf-8'); }
      catch { return reply('Aktiviteter kunne ikke hentes. Prøv igen senere.', 502); }
    }
    if (path.startsWith('/api/')) return reply('Not found', 404);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, headers });
  }
};
