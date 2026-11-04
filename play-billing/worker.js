// StratoshiVibes games — Google Play purchase check (Cloudflare Worker): Blockspace and Bull Run
//
// The Google Play version of the game sends { sku, token } here after every purchase.
// This Worker asks Google whether the purchase is real and paid, and acknowledges
// one-time purchases (Supporter Pack). Google refunds purchases that are not
// acknowledged within 3 days. Packs of Second Chances are consumed by the game itself.
//
// Needs one secret: GOOGLE_SA_KEY = the whole JSON key file of a Google Cloud
// service account that has access to the app in Play Console. See README.md.

// product id -> [Android package of the game that sells it, 'once' (acknowledged here) or 'consumable' (consumed by the game)]
const SKUS = {
  supporter_pack: ['com.stratoshivibes.blockspace', 'once'],
  second_chance_5: ['com.stratoshivibes.blockspace', 'consumable'],
  garage_pass: ['com.stratoshivibes.bullrace', 'once'],
};
const ORIGINS = ['https://blockspace.stratoshivibes.com', 'https://bullrun.stratoshivibes.com'];
const API = pkg => 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + pkg + '/purchases/products/';

let cachedToken = null, cachedUntil = 0;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health') return json({ ok: true, configured: !!env.GOOGLE_SA_KEY });
    if (url.pathname !== '/verify' || req.method !== 'POST') return json({ error: 'not found' }, 404);

    let body;
    try { body = await req.json(); } catch (e) { return json({ ok: false, reason: 'bad request' }, 400); }
    const sku = String(body.sku || ''), token = String(body.token || '');
    if (!SKUS[sku] || !/^[A-Za-z0-9._\-]{20,1000}$/.test(token)) return json({ ok: false, reason: 'bad request' }, 400);

    try {
      const access = await googleToken(env);
      const base = API(SKUS[sku][0]) + encodeURIComponent(sku) + '/tokens/' + encodeURIComponent(token);
      const r = await fetch(base, { headers: { Authorization: 'Bearer ' + access } });
      if (r.status === 400 || r.status === 404 || r.status === 410) return json({ ok: false, reason: 'unknown purchase' });
      if (!r.ok) return json({ error: 'google ' + r.status }, 502);
      const p = await r.json();
      // purchaseState: 0 purchased, 1 cancelled, 2 pending
      if (p.purchaseState !== 0) return json({ ok: false, reason: p.purchaseState === 2 ? 'pending' : 'cancelled' });
      if (SKUS[sku][1] === 'once' && p.acknowledgementState === 0) {
        const a = await fetch(base + ':acknowledge', {
          method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' }, body: '{}',
        });
        if (!a.ok && a.status !== 400) return json({ error: 'acknowledge ' + a.status }, 502);
      }
      return json({ ok: true, test: p.purchaseType === 0 });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 502);
    }
  },
};

// OAuth access token for the service account (JWT signed with its private key), cached ~50 minutes.
async function googleToken(env) {
  if (cachedToken && Date.now() < cachedUntil) return cachedToken;
  if (!env.GOOGLE_SA_KEY) throw new Error('GOOGLE_SA_KEY secret is missing');
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const now = Math.floor(Date.now() / 1000);
  const b64u = x => btoa(typeof x === 'string' ? x : String.fromCharCode(...new Uint8Array(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64u(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claims));
  const jwt = head + '.' + claims + '.' + b64u(sig);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('google auth: ' + (j.error_description || j.error || r.status));
  cachedToken = j.access_token; cachedUntil = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}
