# Deployment Checklist

## GitHub repository

- [ ] Back up the existing `CV` repository.
- [ ] Upload all files and folders from this package to the repository root.
- [ ] Confirm GitHub Pages deploys from the intended branch and root folder.
- [ ] Confirm `.nojekyll` is present.

## Public URL tests

- [ ] `https://hossam-ali-hr.github.io/CV/`
- [ ] `https://hossam-ali-hr.github.io/CV/en/`
- [ ] `https://hossam-ali-hr.github.io/CV/ar/`
- [ ] `https://hossam-ali-hr.github.io/CV/assets/images/profile.webp`
- [ ] `https://hossam-ali-hr.github.io/CV/manifest.webmanifest`
- [ ] `https://hossam-ali-hr.github.io/CV/robots.txt`
- [ ] `https://hossam-ali-hr.github.io/CV/sitemap.xml`
- [ ] `https://hossam-ali-hr.github.io/CV/llms.txt`

## SEO verification

- [ ] Add or verify the site in Google Search Console.
- [ ] Submit `https://hossam-ali-hr.github.io/CV/sitemap.xml`.
- [ ] Inspect `/en/` and `/ar/` in URL Inspection.
- [ ] Validate ProfilePage and Article JSON-LD.
- [ ] Add the website URL to LinkedIn and other professional profiles.
- [ ] Review indexed titles, descriptions and queries after deployment.

## SEO maintenance (20 October 2026)

Run `python scripts/check_site.py` before publishing. It checks all 26 HTML pages,
local assets and anchors, unique metadata, JSON-LD syntax, reciprocal language
alternatives and the 24 canonical sitemap URLs. Run `node --check assets/js/main.js`
when changing navigation behavior.

The repository-level `/CV/robots.txt` is **not** the host's robots policy. Crawlers
read `https://hossam-ali-hr.github.io/robots.txt` at the host root. Keep the site
crawlable there if a user-site repository supplies that file. Do not assume the
project file submits the sitemap: submit `/CV/sitemap.xml` in a verified Search
Console URL-prefix property for `https://hossam-ali-hr.github.io/CV/`.

After deployment, inspect both profile URLs and a project page. Check the rendered
HTML, indexability and selected canonical in Search Console. Compare impressions,
clicks and queries over equivalent periods; no ranking or indexing result is
guaranteed by a code change. Search Console verification and sitemap submission
are account actions and have not been performed by this repository update.

Update sitemap lastmod and visible article dates only when the page content has
meaningfully changed. Keep original publication dates. Illustrative examples and
proposed evaluation measures must not be described as measured client results.

Sources:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt
- https://developers.google.com/search/docs/crawling-indexing/301-redirects
