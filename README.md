# Hossam Aly Personal Website — GitHub Pages Package

## Configured public URL

`https://hossam-ali-hr.github.io/CV/`

This package is configured specifically for the GitHub Pages repository path `/CV/`.
All canonical URLs, language alternatives, social metadata, structured data, sitemap links,
asset paths and navigation links include the repository subpath.

## Profile image

The live `profile.webp` image has been included at:

`assets/images/profile.webp`

## Publishing

Upload the **contents of this folder** to the root of the `CV` repository, replacing the old site files.
Keep the repository and Pages path capitalization as `CV` because URLs are case-sensitive.

After pushing the files, verify:

- `https://hossam-ali-hr.github.io/CV/`
- `https://hossam-ali-hr.github.io/CV/en/`
- `https://hossam-ali-hr.github.io/CV/ar/`
- `https://hossam-ali-hr.github.io/CV/sitemap.xml`
- `https://hossam-ali-hr.github.io/CV/robots.txt`

## Search setup

Submit this sitemap in Google Search Console and Bing Webmaster Tools:

`https://hossam-ali-hr.github.io/CV/sitemap.xml`

The package includes separate Arabic and English URLs, ProfilePage/Article structured data,
Open Graph metadata, robots.txt, llms.txt and a PWA manifest.

## 2026 redesign notes

The site was visually redesigned (editorial/executive identity) without changing URLs,
SEO metadata, structured data, sitemap, robots, llms.txt or the bilingual structure.

- Design tokens live in `assets/css/main.css` (`:root` variables for color, type, spacing).
- Typography: Newsreader + IBM Plex Sans (English); Noto Naskh Arabic + IBM Plex Sans Arabic (Arabic).
- JavaScript (`assets/js/main.js`) handles only the mobile menu, footer year and optional
  scroll reveals; everything works without JavaScript.
- BreadcrumbList JSON-LD was added to case-study, insight and listing pages; all
  pre-existing schema (ProfilePage, Person, TechArticle, Article, CollectionPage) is unchanged.

## QA maintenance patch

The reviewed package also includes corrected capability-strip CSS, page-specific x-default hreflang,
multilingual sitemap alternates, richer social metadata, improved mobile-menu announcements and a
new social sharing image consistent with the editorial design.

## Public HR tools

`/ar/tools/` and `/en/tools/` list the public HR calculators. The first tool is
`tools/leave-eos-calculator.html`, adapted from the Wifaq leave/EOS prototype for
manual, anonymous calculations. No source ZIP, CSV templates, employee-management
screens or saved-record functions are published with the tool.

The calculator uses `assets/js/entitlements-core.js` for pure arithmetic and
`assets/js/calculator.js` for the form. It does not read or write browser storage,
accept files, submit forms or send calculation inputs over the network. Its page
CSP also blocks connections and form submission. Printing is initiated by the
visitor. Inputs are cleared on reset and page exit; no payment ledger is kept.

Run `node scripts/check_calculator.cjs` for calculation and privacy regression
examples, and `python scripts/check_site.py` for site metadata and local links.
The page documents date boundaries, policy assumptions and excluded settlement
items. The housing-advance preview is separate from the termination estimate.
