# Search discovery

Tukany publishes the explorer, a practice guide, and a scale formula reference in English, Brazilian Portuguese, and Spanish. Each page has its own HTTPS URL and links to its translations. The sitemap includes those nine pages and the four printable lessons. A player's shared settings are carried in the URL query string and use the explorer's language page as the canonical URL. [Production sitemap](https://tukany.com/sitemap.xml)

The robots file allows crawlers to fetch the pages and their assets. Tools that support the optional `llms.txt` convention can use Tukany's directory to find the guides and formula references in Markdown and the original PDF lessons. [Crawler policy](https://tukany.com/robots.txt) · [Tukany agent directory](https://tukany.com/llms.txt) · [llms.txt proposal](https://llmstxt.org/)

## Submit the production site

1. Open the homepage and sitemap over HTTPS. Both should load directly at `tukany.com`. If either opens a registrar landing page, check the apex DNS records and the Pages custom domain before submitting. [GitHub Pages domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
2. In Google Search Console, add the **Domain** property `tukany.com`. Choose TXT verification. In Namecheap, open **Advanced DNS → Host Records**, add a TXT record at `@` with Google's exact value, save it, then verify in Search Console. Keep that record for future ownership checks. [Google ownership verification](https://support.google.com/webmasters/answer/9008080)
3. Under **Sitemaps**, submit `https://tukany.com/sitemap.xml`. Use **URL Inspection → Test live URL** on a practice guide to confirm Google can fetch its content. [Google sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
4. In Bing Webmaster Tools, import the verified Google property and its sitemap, or add and verify Tukany directly. Confirm the sitemap appears under **Sitemaps**. [Bing verification and import](https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/)

## Learn what brings players to Tukany

Check the Page Indexing report after publication. Once impressions accumulate, compare queries, pages, and clicks in Search Console's Performance report. If players find a practice guide through a recurring question, use their wording to clarify its instructions and add a working fretboard example. [Search Console reports](https://support.google.com/webmasters/answer/10267942)

For AI answers, Bing Webmaster Tools’ **AI Performance** report shows which Tukany pages were cited and a sample of the retrieval queries. Check those pages alongside their search clicks to see where practice material is finding an audience. [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)

The build derives the sitemap from `src/site.mjs` and the published books in `src/guides.mjs`. When adding a guide, update `public/llms.txt` with its reader-facing title and Markdown URL.
