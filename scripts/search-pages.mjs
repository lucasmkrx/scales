import { LANGUAGES } from '../src/locales.mjs';
import { copy } from '../src/i18n.mjs';
import { pageDetails, routes, siteOrigin } from '../src/site.mjs';
import { escape } from '../src/board.mjs';
import { referenceCopy } from './reference-pages.mjs';
import { practiceContent } from './practice-content.mjs';

export function metadata(lang, kind) {
  const t = copy[lang];
  const resource =
    kind === 'guide'
      ? practiceContent[lang]
      : kind === 'reference'
        ? referenceCopy[lang]
        : null;
  const title = resource ? resource.title + ' · Tukany' : t.pageTitle;
  const description = resource ? resource.description : t.metaDescription;
  const { url, jsonLd } = pageDetails(lang, kind, title, description);
  const alternates = Object.values(routes).map(
    (route) =>
      `<link rel="alternate" hreflang="${route.hreflang}" href="${siteOrigin}${route[kind]}" />`,
  );
  const preview = siteOrigin + '/assets/tukany-social.jpg';
  const social = {
    'og:type': resource ? 'article' : 'website',
    'og:site_name': 'Tukany',
    'og:url': url,
    'og:title': title,
    'og:description': description,
    'og:locale': routes[lang].socialLocale,
    'og:image': preview,
    'og:image:type': 'image/jpeg',
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': t.socialImageAlt,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': preview,
    'twitter:image:alt': t.socialImageAlt,
  };
  return [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width,initial-scale=1" />',
    '<meta name="theme-color" content="#214b3d" />',
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    '<meta name="robots" content="max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    ...alternates,
    `<link rel="alternate" hreflang="x-default" href="${siteOrigin}${routes.en[kind]}" />`,
    `<link rel="describedby" type="text/plain" href="${siteOrigin}/llms.txt" />`,
    ...(resource
      ? [`<link rel="alternate" type="text/markdown" href="${url}index.md" />`]
      : []),
    ...Object.entries(social).map(
      ([name, value]) =>
        `<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${escape(value)}" />`,
    ),
    `<script type="application/ld+json" id="page-schema">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
}

// The explorer's data-i18n attributes mark leaf text nodes, just as they do in the browser.
export function explorerPage(template, lang, base) {
  const t = copy[lang];
  const translate = (_, tag, key) => tag + escape(t[key]);
  const themeLabel = t.themeLabel
    .replace('{current}', t.themeModes.light)
    .replace('{next}', t.themeModes.dark);
  const languages = Object.entries(routes).map(
    ([key, route]) =>
      `<a hreflang="${route.hreflang}" lang="${LANGUAGES[key].tag}" href="${base}${route.home.slice(1)}">${LANGUAGES[key].label}</a>`,
  );
  return template
    .replace(
      '<html lang="en-US">',
      `<html lang="${LANGUAGES[lang].tag}" data-page-language="${lang}">`,
    )
    .replace(/(<[\w-]+\b[^<>]*\bdata-i18n="([^"]+)"[^<>]*>)[^<]*(?=<\/)/g, translate)
    .replace(/<[^<>]*\bdata-i18n-aria="([^"]+)"[^<>]*>/g, (tag, key) =>
      tag.replace(/aria-label="[^"]*"/, `aria-label="${escape(t[key])}"`),
    )
    .replaceAll('Theme: Light. Switch to Dark.', escape(themeLabel))
    .replace('id="theme-mode">Light<', `id="theme-mode">${escape(t.themeModes.light)}<`)
    .replace(/(<select id="language">[\s\S]*?<\/select\s*>)/, (block) =>
      block.replace(`value="${lang}"`, `value="${lang}" selected`),
    )
    .replace('aria-label="Scale choices"', `aria-label="${escape(t.scale)}"`)
    .replace('aria-label="Notes"', `aria-label="${escape(t.notes)}"`)
    .replace('href="./scales/"', `href="./${routes[lang].reference.slice(1)}"`)
    .replace('href="./practice/"', `href="./${routes[lang].guide.slice(1)}"`)
    .replace(/(href|src)="\.\//g, `$1="${base}`)
    .replace('<!-- language-links -->', languages.join(' · '))
    .replace('<!-- page-metadata -->', metadata(lang, 'home'));
}
