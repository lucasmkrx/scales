import { escape } from '../src/board.mjs';
import { copy } from '../src/i18n.mjs';
import { LANGUAGES } from '../src/locales.mjs';
import { routes } from '../src/site.mjs';

export const license = 'https://creativecommons.org/licenses/by/4.0/';
export const source = 'https://github.com/lucasmkrx/tukany';

export function readingPage(lang, kind, head, base, revision, content) {
  const t = copy[lang];
  const explorer = routes[lang].home + '?lang=' + lang;
  const href = (path) => escape(base + path.slice(1));
  const asset = (path) => href('/' + path) + '?v=' + revision;
  const locales = Object.entries(LANGUAGES)
    .map(
      ([key, { tag, label }]) =>
        `<a href="${href(routes[key][kind])}" lang="${tag}" hreflang="${routes[key].hreflang}"${key === lang ? ' aria-current="page"' : ''}>${escape(label)}</a>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="${LANGUAGES[lang].tag}">
<head>
${head}
<link rel="icon" href="${asset('assets/icon.png')}" type="image/png" sizes="64x64">
<script src="${asset('theme.js')}"></script>
<link rel="stylesheet" href="${asset('vendor/fontawesome.min.css')}">
<link rel="stylesheet" href="${asset('styles.css')}">
<link rel="stylesheet" href="${asset('practice.css')}">
${kind === 'reference' ? `<link rel="stylesheet" href="${asset('reference.css')}">` : ''}
</head>
<body class="practice-page">
<header class="site-header">
  <div class="masthead">
    <a class="wordmark" href="${href(explorer)}"><span class="brand-mark"><i class="icon fa-solid fa-guitar" aria-hidden="true"></i></span>Tukany</a>
    <nav class="practice-languages" aria-label="${escape(t.language)}">${locales}</nav>
  </div>
</header>
<main class="practice-guide">
${content}
</main>
<footer class="site-footer">
  <img src="${asset('assets/marques-and-co.png')}" alt="Marques &amp; Co." width="120" height="17">
  <a href="${license}" rel="license">CC BY 4.0</a>
  <a href="${source}">${escape(t.source)}</a>
</footer>
</body>
</html>
`;
}
