// Routing for a single-page site that must still answer 404 honestly.
//
// Why a Function and not _redirects: proven on this project's own preview URL on
// 2026-08-23, _redirects silently DISCARDS any rule whose status is 404. A 302 rule
// fired; the identical 404 rules did nothing and every request fell through to the
// catch-all. 404 is a Netlify feature, not a Cloudflare Pages one.
//
// That also settles the 2026-08-18 outage: the 404 rules in the reverted commit were
// inert, so the root 404.html was the only thing that ever changed behaviour. Pages
// adopts a root 404.html as its own not-found handler and it pre-empts the SPA rewrite.
// Hence: no file named 404.html in this project, ever. The body lives in not-found.html.
//
// Pages strips .html and 308-redirects: /index.html -> / and /not-found.html ->
// /not-found (measured 2026-08-23). The subrequests below use the canonical form so
// they do not spend a redirect hop, and so a 308 body can never be returned as a 404.
//
// Order below is deliberate: a real file always wins, so a future
// /.well-known/agent.json (#98 step 3) serves normally without touching this list.

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

  // 1. A genuine static asset wins over everything: index.html, robots.txt,
  //    sitemap.xml, images, and anything published under /.well-known/ later.
  const asset = await next();
  if (asset.status !== 404) return asset;

  // 2. A known app route: hand over the app at 200.
  const path = url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '/';
  if (ROUTES.has(path)) {
    const app = await fetch(new URL('/', url));
    return new Response(app.body, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // 3. Nothing here. Say so with a real status, not 200 plus the homepage.
  const nf = await fetch(new URL('/not-found', url));
  return new Response(nf.body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
