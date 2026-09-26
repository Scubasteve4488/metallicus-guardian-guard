# Vendored dependencies

| File | Package | Version | Source | License | Integrity |
|---|---|---|---|---|---|
| `phaser.min.js` | phaser | 4.2.1 (npm `latest` tag, published 2026-07-09) | https://registry.npmjs.org/phaser/-/phaser-4.2.1.tgz → `dist/phaser.min.js` | MIT (`PHASER-LICENSE.md`, copied unmodified from the package) | tarball `sha512-WUNwCPJpdjvZiuT6SgCfYVW8Qw/3j0jJ4ws7P2QkhFLFu74sbGuyHJcbFueGkY/AYO4Pi47bNQXn1OCJeLX//w==`; file sha256 `66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de` |

Phaser is vendored (not loaded from a CDN) so the page works offline and stays
inside the site's `script-src 'self'` Content-Security-Policy.

No other third-party code or art is included. Detective Board and Water Pipe were
used as mechanic references only; no code or assets were copied from either.

`../assets/phaser-default.png`, `phaser-missing.png` and `phaser-white.png` are
Phaser's own built-in placeholder textures (base64 strings in
`src/core/Config.js` of phaser 4.2.1, MIT), decoded to files so they load under
`img-src 'self'`. They are engine internals, not game art.
