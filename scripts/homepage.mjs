import { copy } from '../src/i18n.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import {
  coffeeUrl,
  explorerUrl,
  pageDetails,
  siteOrigin,
  socialImageUrl,
} from '../src/site.mjs';
import { escape } from '../src/board.mjs';

function metadata(lang) {
  const { title, description, url, jsonLd, social } = pageDetails(lang);
  const tags = {
    'og:type': 'website',
    'og:site_name': 'Tukany',
    'og:image': socialImageUrl,
    'og:image:type': 'image/jpeg',
    'og:image:width': '1200',
    'og:image:height': '630',
    'twitter:card': 'summary_large_image',
    'twitter:image': socialImageUrl,
    ...social,
  };
  return [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width,initial-scale=1" />',
    '<meta name="theme-color" content="#ffffff" />',
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    '<meta name="robots" content="max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    ...Object.keys(LANGUAGES).map(
      (key) => `<link rel="alternate" hreflang="${key}" href="${explorerUrl(key)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${explorerUrl('en')}" />`,
    `<link rel="describedby" type="text/plain" href="${siteOrigin}/llms.txt" />`,
    ...Object.entries(tags).map(
      ([name, value]) =>
        `<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${escape(value)}" />`,
    ),
    `<script type="application/ld+json" id="page-schema">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
}

// The explorer's data-i18n attributes mark leaf text nodes, just as they do in the browser.
export function explorerPage(template, lang = 'en') {
  const t = copy[lang];
  const translate = (_, tag, key) => tag + escape(t[key]);
  const themeLabel = t.themeLabel
    .replace('{current}', t.themeModes.light)
    .replace('{next}', t.themeModes.dark);
  return template
    .replace(
      'lang="en-US" data-page-language="en"',
      `lang="${LANGUAGES[lang].tag}" data-page-language="${lang}"`,
    )
    .replace(`<option value="${lang}" lang=`, `<option selected value="${lang}" lang=`)
    .replaceAll('Theme: Light. Switch to Dark.', escape(themeLabel))
    .replace(coffeeUrl('en'), coffeeUrl(lang))
    .replace(/(<[\w-]+\b[^<>]*\bdata-i18n="([^"]+)"[^<>]*>)[^<]*(?=<\/)/g, translate)
    .replace(/<[^<>]*\bdata-i18n-aria="([^"]+)"[^<>]*>/g, (tag, key) =>
      tag.replace(/aria-label="[^"]*"/, `aria-label="${escape(t[key])}"`),
    )
    .replace('<!-- page-metadata -->', metadata(lang))
    .replace(/\b(href|src|data-flag)="\.\//g, lang === 'en' ? '$&' : '$1="../');
}
