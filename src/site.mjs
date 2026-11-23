import { copy } from './i18n.mjs';
import { LANGUAGES } from './locales.mjs';

export const siteOrigin = 'https://tukany.com';
export const socialImageUrl = siteOrigin + '/assets/tukany-social.jpg';

// Resolve against the deployment root so project-path previews work as well.
export const explorerPath = (lang) => (lang === 'en' ? './' : `./${lang}/`);
export const explorerUrl = (lang) => new URL(explorerPath(lang), siteOrigin).href;

// Buy Me a Coffee's creator pages currently fall back to English for Portuguese.
export const coffeeUrl = (lang) =>
  'https://buymeacoffee.com/lucasmkrx?l=' + (lang === 'pt' ? 'en' : lang);

export function pageDetails(lang) {
  const { pageTitle: title, metaDescription: description, socialImageAlt } = copy[lang];
  const url = explorerUrl(lang);
  const author = {
    '@type': 'Person',
    '@id': 'https://lucasgmarques.com/#person',
    name: 'Lucas Marques',
    url: 'https://lucasgmarques.com/',
    sameAs: 'https://github.com/lucasmkrx',
  };
  const site = {
    '@type': 'WebSite',
    '@id': siteOrigin + '/#website',
    url: siteOrigin + '/',
    name: 'Tukany',
    inLanguage: Object.values(LANGUAGES).map(({ tag }) => tag),
    publisher: { '@id': author['@id'] },
  };
  const entity = {
    '@type': 'WebApplication',
    '@id': siteOrigin + '/#app',
    name: 'Tukany',
    url: site.url,
    image: siteOrigin + '/assets/icon.png',
    description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    inLanguage: site.inLanguage,
    author: { '@id': author['@id'] },
  };
  const page = {
    '@type': 'WebPage',
    '@id': url + '#webpage',
    url,
    name: title,
    description,
    inLanguage: LANGUAGES[lang].tag,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: socialImageUrl,
      caption: socialImageAlt,
    },
    isPartOf: { '@id': site['@id'] },
    mainEntity: { '@id': entity['@id'] },
  };
  return {
    url,
    title,
    description,
    social: {
      'og:url': url,
      'og:title': title,
      'og:description': description,
      'og:locale': LANGUAGES[lang].tag.replace('-', '_'),
      'og:image:alt': socialImageAlt,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image:alt': socialImageAlt,
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [site, page, entity, author],
    },
  };
}

// Language can change without a navigation while a custom edit is open.
export function syncExplorerPage(lang) {
  const details = pageDetails(lang);
  document.documentElement.lang = LANGUAGES[lang].tag;
  document.documentElement.dataset.pageLanguage = lang;
  document.title = details.title;
  document.querySelector('meta[name=description]').content = details.description;
  document.querySelector('link[rel=canonical]').href = details.url;
  document.getElementById('coffee-link').href = coffeeUrl(lang);
  for (const [name, value] of Object.entries(details.social))
    document.querySelector(`meta[property="${name}"], meta[name="${name}"]`).content =
      value;
  document.getElementById('page-schema').textContent = JSON.stringify(details.jsonLd);
}
