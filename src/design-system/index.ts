/**
 * Vendored @arasya/design-system v0.1.0.
 *
 * The package is not published to npm (registry returns 404), so the 20
 * components were ported from the design-sync bundle at
 * `arasya-handoff/_ds/arasya-design-system-<id>/_ds_bundle.js`, which ships the
 * real upstream source unminified. `arasya-ds.css` is that bundle's stylesheet
 * copied byte-for-byte, so every `ar-*` class resolves exactly as it did in the
 * `.dc.html` prototypes.
 *
 * Never invent new `ar-*` class names. Layout glue belongs in your own styles,
 * built from the `--ar-*` tokens.
 */

export * from './icons';
export * from './utils';
export * from './server';
export * from './client';
