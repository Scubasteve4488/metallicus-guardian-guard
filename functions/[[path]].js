// Routing for a single-page site that must still answer 404 honestly.
//
// Why a Function and not _redirects: proven on this project's own preview URL on
// 2026-08-23, _redirects silently DISCARDS any rule whose status is 404. A 302 rule
// fired; the identical 404 rules did nothing and every request fell through to the
// catch-all. 404 is a Netlify feature, not a Cloudflare Pages one.
//
// Why the route table decides and next() does not: measured on the preview URL on
// 2026-08-23, with no root 404.html in the project the Pages asset server answers
// EVERY unmatched path with index.html at 200. next() inherits that, so a Function
// can never see a 404 from it - /this-does-not-exist, /_headers and /_redirects all
// came back 200 with the 675KB homepage. The SPA fallback is not a rule we wrote; it
// is Pages' built-in behaviour, and it is the thing that has to be overruled here.
//
// That also settles the 2026-08-18 outage: the 404 rules in the reverted commit were
// inert, so the root 404.html was the only thing that ever changed behaviour. Pages
// adopts a root 404.html as its own not-found handler, which switches the SPA fallback
// off - and with the 404 rules inert there was nothing left to serve the deep routes,
// so they went dark. Hence: no file named 404.html in this project. The list below is
// what keeps the deep routes alive, and the not-found body lives in not-found.html.
//
// Pages strips .html and 308-redirects: /index.html -> / and /not-found.html ->
// /not-found (measured 2026-08-23). The subrequest below uses the canonical form.

const ROUTES = new Set([
  '/',
  '/guard',
  '/start-here',
  '/new-to-guard',
  '/ecosystem',
  '/academy',
  '/shields',
  '/arena',
  '/defi-forge',
  '/xpr-journey',
  '/guardian-intelligence',
  '/stablecoins-payments',
  '/vision',
  '/creator',
  '/faq',
  '/community',
  '/community/ksto',
  '/community/cyphergang',
  '/community/snipverse',
]);

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '/';

  const asset = await next();
  const isHtml = (asset.headers.get('content-type') || '').includes('text/html');

  // 1. Anything that is not HTML-at-200 is the asset server speaking for itself:
  //    robots.txt, sitemap.xml, images, a future /.well-known/agent.json (#98 step 3),
  //    and the .html -> extensionless 308s. A real file always wins. Pass it straight
  //    through, untouched, so it keeps its own ETag and caching. This runs before the
  //    casing rule below, so a genuinely capitalised FILENAME is never redirected.
  if (asset.status !== 200 || !isHtml) return asset;

  // 2. HTML at 200 is only trustworthy for a path we actually publish. For those,
  //    that response IS the app - no subrequest needed.
  if (ROUTES.has(path)) return asset;

  // 3. Same route, wrong case (/GUARD). The old catch-all answered these 200 because
  //    it answered everything 200; strict matching would now 404 a link someone has
  //    already shared. Send them to the canonical lowercase form instead, so the route
  //    keeps working and crawlers still see exactly one URL per page.
  const lower = path.toLowerCase();
  if (lower !== path && ROUTES.has(lower)) {
    const dest = new URL(url);
    dest.pathname = lower;
    return Response.redirect(dest.toString(), 301);
  }

  // 4. The not-found page itself, reached directly. Serve it, but never at 200.
  if (path === '/not-found') {
    return new Response(asset.body, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // 5. Everything else got here on the SPA fallback, not because anything is
  //    published at this address. Say so with a real status.
  const nf = await next(new Request(new URL('/not-found', url), request));
  return new Response(nf.body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
