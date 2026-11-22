import { copy } from './i18n.mjs';
import { LANGUAGES } from './locales.mjs';

export const siteOrigin = 'https://tukany.com';
export const routes = {
  en: {
    home: '/',
    guide: '/practice/',
    reference: '/scales/',
    hreflang: 'en',
    socialLocale: 'en_US',
  },
  pt: {
    home: '/pt/',
    guide: '/pt/pratica/',
    reference: '/pt/escalas/',
    hreflang: 'pt-BR',
    socialLocale: 'pt_BR',
  },
  es: {
    home: '/es/',
    guide: '/es/practica/',
    reference: '/es/escalas/',
    hreflang: 'es',
    socialLocale: 'es_419',
  },
};

export function pageDetails(lang, kind, title, description) {
  const guide = kind === 'guide';
  const reference = kind === 'reference';
  const url = siteOrigin + routes[lang][kind];
  const site = {
    '@type': 'WebSite',
    '@id': siteOrigin + '/#website',
    url: siteOrigin + '/',
    name: 'Tukany',
    inLanguage: Object.values(LANGUAGES).map(({ tag }) => tag),
  };
  const author = {
    '@type': 'Person',
    name: 'Lucas Marques',
    url: 'https://github.com/lucasmkrx',
  };
  const entity =
    guide || reference
      ? {
          '@type': reference ? 'LearningResource' : 'Article',
          '@id': url + '#resource',
          name: title,
          headline: title,
          description,
          image: siteOrigin + '/assets/tukany-social.jpg',
          inLanguage: LANGUAGES[lang].tag,
          url,
          author,
        }
      : {
          '@type': 'WebApplication',
          '@id': siteOrigin + '/#app',
          name: 'Tukany',
          url: siteOrigin + '/',
          description,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Any',
          isAccessibleForFree: true,
          inLanguage: site.inLanguage,
          author,
        };
  const page = {
    '@type': 'WebPage',
    '@id': url + '#webpage',
    url,
    name: title,
    description,
    inLanguage: LANGUAGES[lang].tag,
    isPartOf: { '@id': site['@id'] },
    mainEntity: { '@id': entity['@id'] },
  };
  return {
    url,
    title,
    description,
    jsonLd: { '@context': 'https://schema.org', '@graph': [site, page, entity] },
  };
}

// Language can change without a navigation while a custom edit is open.
export function syncExplorerPage(lang) {
  const t = copy[lang];
  const details = pageDetails(lang, 'home', t.pageTitle, t.metaDescription);
  document.documentElement.dataset.pageLanguage = lang;
  document.querySelector('link[rel=canonical]').href = details.url;
  const values = {
    'og:title': details.title,
    'og:description': details.description,
    'og:url': details.url,
    'og:locale': routes[lang].socialLocale,
    'og:image:alt': t.socialImageAlt,
    'twitter:title': details.title,
    'twitter:description': details.description,
    'twitter:image:alt': t.socialImageAlt,
  };
  for (const [name, value] of Object.entries(values))
    document.querySelector(`meta[property="${name}"], meta[name="${name}"]`).content =
      value;
  document.getElementById('page-schema').textContent = JSON.stringify(details.jsonLd);
  const root = new URL('../', import.meta.url);
  for (const kind of ['guide', 'reference'])
    for (const link of document.querySelectorAll(`[data-${kind}-link]`))
      link.href = new URL(routes[lang][kind].slice(1), root).href;
}
