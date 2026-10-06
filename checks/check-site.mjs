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
  const nav = t.match(/<nav id="nav"[\s\S]*?<\/nav>/), foot = t.match(/<footer id="site-footer">[\s\S]*?<\/footer>/);
  if (!nav || !foot) fails.push(rel(f) + ': no shared nav/footer'); else { navs.add(nav[0]); foots.add(foot[0]); }
  for (const b of BANNED) if (b.test(t)) fails.push(rel(f) + ': banned line ' + b);
  if (OLDART.test(t)) fails.push(rel(f) + ': old character art ' + t.match(OLDART)[0]);
  if (/\brangel\b/i.test(t)) fails.push(rel(f) + ': legal surname');
  if (/[a-z0-9._%+-]+@(?!usernames|username\b)[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) fails.push(rel(f) + ': email address');
}
if (navs.size > 1) fails.push('nav differs across pages: ' + navs.size);
if (foots.size > 1) fails.push('footer differs across pages: ' + foots.size);
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
