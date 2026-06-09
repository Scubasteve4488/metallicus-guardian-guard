const PROMPT = `Search for the 6 most recent news items, announcements, or updates from the Metallicus ecosystem. Sources to check: metallicus.com/news, xprnetwork.org/blog, and recent posts from these X accounts: @MetallicusHQ, @XPRNetwork, @webauthwallet, @MetalXApp, @MetalBlockchain, @Metal_L2, @BlastpadXPR, @marshallhayner, @Keep_Snipping, @snipverse, @0xCypherPunk, @funkyfVerse. Return results as JSON array with fields: title, date, summary (1 sentence), source, url, category (one of: Metallicus, XPR Network, WebAuth, Metal X, Community). Sort by most recent first.

Respond with ONLY a valid JSON array. No markdown, no code fences, no explanations.`;

export async function onRequestGet(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: PROMPT }],
      }),
    });

    if (!resp.ok) {
      return json({ error: 'Upstream API error: ' + resp.status }, 502);
    }

    const data = await resp.json();
    const text = (data.content?.[0]?.text || '[]').trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let items;
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) items = [];
    } catch (_) {
      items = [];
    }

    return json({ items, timestamp: Date.now() });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
