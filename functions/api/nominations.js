// Cloudflare Pages Function — /api/nominations
// KV binding:  GUARD_KV          (same namespace as guardians)
// Env var:     GUARD_ADMIN_SECRET (set in Pages → Settings → Environment variables)
//
// POST  /api/nominations          — submit a nomination (public)
// GET   /api/nominations?secret=X — view all nominations (admin only)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function sanitize(raw, maxLen = 300) {
  return String(raw || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
}

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.GUARD_KV;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (!kv) {
    return json({ error: 'KV not configured' }, 503);
  }

  // ── POST — submit a nomination ───────────────────────────────────────────
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const nominee  = sanitize(body.nominee, 50);
    const reason   = sanitize(body.reason,  280);
    const nominator = sanitize(body.nominator, 50);

    if (!nominee || nominee.length < 1) return json({ error: 'Nominee handle required' }, 400);
    if (!reason  || reason.length  < 5) return json({ error: 'Reason too short' }, 400);

    const nomination = {
      id:        Date.now().toString(36),
      nominee,
      reason,
      nominator: nominator || '(anonymous)',
      ts:        Date.now(),
      reviewed:  false,
    };

    const existing = (await kv.get('nominations', { type: 'json' })) || [];
    existing.push(nomination);
    // Keep last 500
    await kv.put('nominations', JSON.stringify(existing.slice(-500)));

    return json({ ok: true });
  }

  // ── GET — admin view of nominations ─────────────────────────────────────
  if (request.method === 'GET') {
    const url    = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const adminSecret = env.GUARD_ADMIN_SECRET;

    if (!adminSecret || secret !== adminSecret) {
      return json({ error: 'Unauthorized — pass ?secret=YOUR_ADMIN_SECRET' }, 401);
    }

    const nominations = (await kv.get('nominations', { type: 'json' })) || [];
    // Newest first
    return json(nominations.slice().reverse());
  }

  return json({ error: 'Method not allowed' }, 405);
}
