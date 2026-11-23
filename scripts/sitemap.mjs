import { GUIDED_BOOKS } from '../src/guides.mjs';
import { explorerPath, siteOrigin } from '../src/site.mjs';
import { LANGUAGES } from '../src/locales.mjs';

export function sitemap() {
  const paths = [
    ...Object.keys(LANGUAGES).map(explorerPath),
    ...GUIDED_BOOKS.map(({ file }) => `/guides/${file}`),
  ];
  const entries = paths.map((path) => {
    const url = new URL(path, siteOrigin).href.replaceAll('&', '&amp;');
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
