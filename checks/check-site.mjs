// Node port of checks/check-site.py (no Python on this laptop) plus the 2026-10-02 rules:
// banned lines, old-character art, and internal links/assets/anchors.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2];
const fails = [];
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['.git', 'legacy', 'node_modules', 'docs', 'checks'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : e.name.endsWith('.html') && out.push(p);
  }
  return out;
}
const pages = walk(ROOT);
const rel = p => path.relative(ROOT, p).replaceAll('\\', '/');
function routeFile(r) {
  r = r.split('#')[0].split('?')[0];
  if (r === '/' || r === '') return path.join(ROOT, 'index.html');
  const p = path.join(ROOT, r.replace(/^\//, ''));
  for (const c of [path.join(p, 'index.html'), p + '.html', p]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
const navs = new Set(), foots = new Set();
const BANNED = [/never says safe/i, /gives clarity/i, /before you sign, let me look/i, /what I checked and what I couldn/i, /earn your shield/i,
  /delegat\w* (your|a member|customer)/i];
const OLDART = /img_coin|guard-card-v6|g_token|g_guardian|g_forge|g_path|g_marshall|g_snipverse|g_cypher|img_guard_dark|img_poster/;
for (const f of pages) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:href|src|poster|srcset)="(\/[^"]*)"/g)) {
    const u = m[1];
    if (u.startsWith('/assets/')) { if (!fs.existsSync(path.join(ROOT, u))) fails.push(rel(f) + ': missing asset ' + u); continue; }
    const target = routeFile(u);
    if (!target) { fails.push(rel(f) + ': dead link ' + u); continue; }
    const hash = u.split('#')[1];
    if (hash && !fs.readFileSync(target, 'utf8').includes('id="' + hash + '"')) fails.push(rel(f) + ': missing anchor ' + u);
  }
  // Two shells while the site moves to v3 (2026-10-28): old nav#nav/footer#site-footer, or v3 header.top/footer.foot (docs/SHELL-V3.html).
  const nav = t.match(/<header class="top">[\s\S]*?<\/header>/) || t.match(/<nav id="nav"[\s\S]*?<\/nav>/);
  const foot = t.match(/<footer class="foot">[\s\S]*?<\/footer>/) || t.match(/<footer id="site-footer">[\s\S]*?<\/footer>/);
  if (!nav || !foot) fails.push(rel(f) + ': no shared nav/footer'); else { navs.add(nav[0]); foots.add(foot[0]); }
  for (const b of BANNED) if (b.test(t)) fails.push(rel(f) + ': banned line ' + b);
  if (OLDART.test(t)) fails.push(rel(f) + ': old character art ' + t.match(OLDART)[0]);
  if (/\brangel\b/i.test(t)) fails.push(rel(f) + ': legal surname');
  // Guard.IAN's own address is allowed (Tim, 2026-10-26: "you can do the email"). Any other address still fails.
  if (/[a-z0-9._%+-]+@(?!usernames|username\b|[a-z0-9]+\.token\b)[a-z0-9.-]+\.[a-z]{2,}/i.test(t.replaceAll('guard.ian58@yahoo.com', ''))) fails.push(rel(f) + ': email address');
}
if (navs.size > 2 || (navs.size === 2 && ![...navs].some(n => n.startsWith('<header class="top">')))) fails.push('nav differs across pages: ' + navs.size);
if (foots.size > 2 || (foots.size === 2 && ![...foots].some(n => n.startsWith('<footer class="foot">')))) fails.push('footer differs across pages: ' + foots.size);
for (const line of fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split('\n')) {
  const p = line.trim().split(/\s+/);
  if (!line.trim() || line.trim().startsWith('#') || p[0] === '/*') continue;
  if (p[1] && p[1].startsWith('/') && !routeFile(p[1])) fails.push('_redirects: dead destination ' + p[1]);
}
for (const m of fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/standguard\.net(\/[^<]*)<\/loc>/g))
  if (!routeFile(m[1])) fails.push('sitemap: dead ' + m[1]);
console.log('pages', pages.length);
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
process.exitCode = fails.length ? 1 : 0;
