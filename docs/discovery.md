# How players and crawlers find Tukany

## Language editions

Tukany serves the same guitar and bass scale explorer in six languages. Use these
addresses when linking from a lesson, a repository, or a translation.

| Edition            | Public URL                               | HTML language |
| ------------------ | ---------------------------------------- | ------------- |
| English (US)       | [tukany.com](https://tukany.com/)        | `en-US`       |
| Português (Brasil) | [tukany.com/pt/](https://tukany.com/pt/) | `pt-BR`       |
| Español            | [tukany.com/es/](https://tukany.com/es/) | `es-ES`       |
| Italiano           | [tukany.com/it/](https://tukany.com/it/) | `it-IT`       |
| Français           | [tukany.com/fr/](https://tukany.com/fr/) | `fr-FR`       |
| Deutsch            | [tukany.com/de/](https://tukany.com/de/) | `de-DE`       |

Each address serves HTML in that language, including the title, description, and
heading. Each page identifies its own preferred URL with `rel="canonical"` and
names all six editions with reciprocal `hreflang` links. The alternates use
language codes such as `es` so speakers in any country can find that edition.
The HTML language tag identifies the regional wording. The English root is the
`x-default` fallback. [Google’s guide to localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions)

To point someone to a particular scale, share the browser address after choosing
a practice setup. A practice link carries the musical setup in the query string.
For example, a Portuguese link to A minor pentatonic opens
`/pt/?key=A&scale=minor-pentatonic`. These configurations share the canonical
URL of their language edition. Older links with `?lang=pt`
or other supported language codes still work. [Practice link examples](../README.md#start-with-a-scale)

## Public discovery files

- The sitemap lists the six language URLs.
  Scales, tunings, and custom PDFs generated for an individual practice session
  stay out of the sitemap. [Production sitemap](https://tukany.com/sitemap.xml)
- The crawler policy allows the explorer, scripts, and styles to be
  fetched, and gives the absolute sitemap address. [robots.txt](https://tukany.com/robots.txt)
- The optional Markdown directory gives assistants a short account of the tool
  and direct links to its editions and learning material. Individual services
  choose whether to use it. [llms.txt](https://tukany.com/llms.txt) · [llms.txt proposal](https://llmstxt.org/)

## Verify a release

Run the discovery and build tests, then serve the generated files locally.

```sh
node --test tests/discovery-files.test.mjs tests/build.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

Open a translated edition such as `http://127.0.0.1:4173/pt/` and view its
page source. Check the document language, translated title, canonical URL,
language alternates, and social image. The same
checks apply to the HTTPS production addresses after GitHub Pages deploys the
build. If the domain serves a registrar landing page, check its DNS records and
the repository’s Pages custom domain. [GitHub Pages domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

The build uses the language catalog for discovery. When adding an edition, also
check the README and the agent directory against the new build. [Language catalog](../src/locales.mjs) ·
[Sitemap generator](../scripts/sitemap.mjs)

The earlier English, Portuguese, and Spanish practice and scale-reference
articles have been retired. Keep their HTML and Markdown URLs out of the
sitemap and the agent directory. Expect a 404 for a retired article unless
a page covers the same material and can serve as its permanent redirect
target. [Google’s guidance on moving content](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)

## Submit the deployed sitemap

1. In Google Search Console, select the verified Domain property for
   `tukany.com`. If the domain is new to the account, add the property and put
   its DNS verification record at the domain provider. Keep the record after
   verification. [Google site ownership verification](https://support.google.com/webmasters/answer/9008080)
2. Submit `https://tukany.com/sitemap.xml` under **Sitemaps**, or check the last
   read date and processing status if it is already listed. Inspect one or more
   translated pages with **URL Inspection**. The live test checks what Google
   can fetch now. The indexed report shows the last crawl and the canonical
   Google selected. [Google sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) · [URL Inspection](https://support.google.com/webmasters/answer/9012289)
3. In Bing Webmaster Tools, import the verified Google property and sitemap,
   or use Bing’s own verification. Confirm the production sitemap appears in
   the site’s **Sitemaps** report. [Bing’s import instructions](https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/)

A sitemap helps search engines discover these URLs. Each engine decides which
pages to index and when to show them. Use Search Console’s **Page indexing**
report to check coverage, then filter **Performance** by page and query to see
which editions attract impressions and clicks. Bing’s **AI Performance** report
shows citation activity in supported Microsoft AI experiences. [Google on sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) · [Search Console reports](https://support.google.com/webmasters/answer/10267942) · [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
