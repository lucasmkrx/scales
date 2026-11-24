// SPDX-License-Identifier: MPL-2.0

import { explorerPath, siteOrigin } from '../src/site.mjs';
import { LANGUAGES } from '../src/locales.mjs';

export function sitemap() {
  const entries = Object.keys(LANGUAGES).map((lang) => {
    const url = new URL(explorerPath(lang), siteOrigin).href;
    return `  <url><loc>${url}</loc></url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
