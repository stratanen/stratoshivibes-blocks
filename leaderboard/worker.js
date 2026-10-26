// StratoshiVibes Blockspace leaderboard, a Cloudflare Worker with a D1 database bound as DB.
// Players sign in once by signing a plain message with their wallet (no transaction, no fees).
// The worker checks the ed25519 signature, then accepts end-of-game scores from that address.

const ALLOWED_ORIGINS = ['https://blockspace.stratoshivibes.com', 'https://stratanen.github.io'];
const MAX_SCORE = 5000000;         // anything above is treated as tampering (scores are 10x since Oct 2026)
const MIN_GAP_MS = 15000;          // at most one score every 15 seconds per player
const SESSION_DAYS = 60;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/health') return json({ ok: true, week: isoWeek(Date.now()) });

      if (url.pathname === '/nonce' && req.method === 'GET') {
        const addr = url.searchParams.get('addr') || '';
        if (!validAddr(addr)) return json({ error: 'bad address' }, 400);
        const nonce = randHex(16), now = Date.now();
        await env.DB.prepare('DELETE FROM nonces WHERE exp < ?').bind(now).run();
        await env.DB.prepare('INSERT INTO nonces (nonce, addr, exp) VALUES (?, ?, ?)').bind(nonce, addr, now + 10 * 60e3).run();
        return json({ nonce, message: signInMessage(addr, nonce) });
      }

      if (url.pathname === '/login' && req.method === 'POST') {
        const { addr, nonce, signature } = await req.json();
        if (!validAddr(addr) || typeof nonce !== 'string' || typeof signature !== 'string') return json({ error: 'bad request' }, 400);
        const row = await env.DB.prepare('SELECT addr, exp FROM nonces WHERE nonce = ?').bind(nonce).first();
        await env.DB.prepare('DELETE FROM nonces WHERE nonce = ?').bind(nonce).run();
        if (!row || row.addr !== addr || row.exp < Date.now()) return json({ error: 'sign-in expired, try again' }, 400);
        const ok = await verifyEd25519(b58decode(addr), b64decode(signature), new TextEncoder().encode(signInMessage(addr, nonce)));
        if (!ok) return json({ error: 'signature does not match this address' }, 401);
        const token = randHex(32);
        await env.DB.prepare('INSERT INTO sessions (token, addr, exp) VALUES (?, ?, ?)').bind(token, addr, Date.now() + SESSION_DAYS * 864e5).run();
        return json({ token, addr });
      }

      if (url.pathname === '/score' && req.method === 'POST') {
        const { token, score, mode } = await req.json();
        const s = await env.DB.prepare('SELECT addr, exp, last FROM sessions WHERE token = ?').bind(String(token || '')).first();
        if (!s || s.exp < Date.now()) return json({ error: 'please sign in again' }, 401);
        if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return json({ error: 'score not accepted' }, 400);
        const now = Date.now();
        if (now - s.last < MIN_GAP_MS) return json({ error: 'too fast' }, 429);
        await env.DB.prepare('UPDATE sessions SET last = ? WHERE token = ?').bind(now, token).run();
        const week = isoWeek(now);
        const periods = mode === 'daily' ? ['d-' + utcDay(now)] : [week, 'all'];   // daily challenge has its own board per UTC day
        for (const period of periods) {
          await env.DB.prepare(
            'INSERT INTO scores (addr, period, best, at) VALUES (?1, ?2, ?3, ?4) ' +
            'ON CONFLICT(addr, period) DO UPDATE SET best = excluded.best, at = excluded.at WHERE excluded.best > scores.best'
          ).bind(s.addr, period, score, now).run();
        }
        return json({ ok: true, ...(await standing(env, s.addr, periods[0])) });
      }

      if (url.pathname === '/top' && req.method === 'GET') {
        const sc = url.searchParams.get('scope');
        const scope = sc === 'all' ? 'all' : sc === 'day' ? 'd-' + utcDay(Date.now()) : isoWeek(Date.now());
        const addr = url.searchParams.get('addr');
        const top = await env.DB.prepare('SELECT addr, best FROM scores WHERE period = ? ORDER BY best DESC, at ASC LIMIT 20').bind(scope).all();
        const out = { scope, top: top.results || [] };
        if (validAddr(addr || '')) Object.assign(out, await standing(env, addr, scope));
        return json(out);
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  }
};

async function standing(env, addr, period) {
  const me = await env.DB.prepare('SELECT best, at FROM scores WHERE addr = ? AND period = ?').bind(addr, period).first();
  if (!me) return { me: null };
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE period = ? AND (best > ? OR (best = ? AND at < ?))').bind(period, me.best, me.best, me.at).first();
  return { me: { best: me.best, rank: (r ? r.n : 0) + 1 } };
}

function signInMessage(addr, nonce) {
  return 'StratoshiVibes Blockspace leaderboard sign-in\n\n' +
    'This is a sign-in, not a transaction. It costs nothing and cannot move any funds.\n\n' +
    'Address: ' + addr + '\nNonce: ' + nonce;
}

function utcDay(ms) { return new Date(ms).toISOString().slice(0, 10); }

function isoWeek(ms) {
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function validAddr(a) { return typeof a === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) && b58decode(a).length === 32; }
function b58decode(s) {
  let n = 0n; for (const c of s) { const i = B58.indexOf(c); if (i < 0) return new Uint8Array(); n = n * 58n + BigInt(i); }
  const bytes = []; while (n > 0n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
  for (const c of s) { if (c === '1') bytes.unshift(0); else break; }
  return new Uint8Array(bytes);
}
function b64decode(s) { const bin = atob(s); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
function randHex(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function verifyEd25519(pub, sig, msg) {
  if (pub.length !== 32 || sig.length !== 64) return false;
  for (const alg of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }]) {
    try {
      const key = await crypto.subtle.importKey('raw', pub, alg, false, ['verify']);
      return await crypto.subtle.verify(alg, key, sig, msg);
    } catch (e) { /* try the next algorithm name */ }
  }
  return false;
}
