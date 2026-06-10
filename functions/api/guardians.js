// Cloudflare Pages Function — /api/guardians
// KV binding: GUARD_KV  (configure in Pages project → Settings → Functions → KV namespace bindings)
// Stores the shared Hall of Guardians roster.

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

// Valid XPR Network account name characters (a–z, 1–5, dot, max 13 chars)
function sanitizeActor(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z1-5.]/g, '').slice(0, 13);
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

  // ── GET — return the full sorted roster ──────────────────────────────────
  if (request.method === 'GET') {
    const list = (await kv.get('guardians', { type: 'json' })) || [];
    return json(list);
  }

  // ── POST — upsert a guardian ─────────────────────────────────────────────
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const actor = sanitizeActor(body.actor);
    if (!actor) return json({ error: 'Invalid actor' }, 400);

    const rank = Math.min(6, Math.max(0, parseInt(body.rank) || 0));

    const existing = (await kv.get('guardians', { type: 'json' })) || [];

    // Remove any prior entry for this actor, prepend fresh entry
    const filtered = existing.filter(g => g.actor !== actor);
    filtered.unshift({ actor, rank, ts: Date.now() });

    // Sort: rank desc, then most-recent first; keep top 200
    const sorted = filtered
      .sort((a, b) => b.rank - a.rank || b.ts - a.ts)
      .slice(0, 200);

    await kv.put('guardians', JSON.stringify(sorted));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
