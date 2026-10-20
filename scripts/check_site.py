"""Validate static pages and SEO relationships using only the Python standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin, unquote
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://hossam-ali-hr.github.io/CV/'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []; self.ids = []; self.h1 = 0; self.title = ''; self.in_title = False
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); self.tags.append((tag, a))
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.in_title = True
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data
    def meta(self, name):
        return [a.get('content', '') for t, a in self.tags if t == 'meta' and (a.get('name') == name or a.get('property') == name)]
    def links(self, rel):
        return [a for t, a in self.tags if t == 'link' and a.get('rel') == rel]

def url(path):
    return BASE + str(path.relative_to(ROOT)).replace('index.html', '')

def local(u):
    parts = urlsplit(u)
    if parts.netloc != urlsplit(BASE).netloc or not parts.path.startswith('/CV/'): return None
    p = ROOT / unquote(parts.path[len('/CV/'):])
    return p / 'index.html' if parts.path.endswith('/') else p

pages = {p: Page(p.read_text()) for p in ROOT.rglob('*.html')}
errors = []
def check(ok, message):
    if not ok: errors.append(message)

titles = set(); descriptions = set(); canonical_pages = set()
for p, doc in pages.items():
    label = str(p.relative_to(ROOT)); indexed = label.startswith(('en/', 'ar/'))
    check(doc.h1 == 1, f'{label}: expected one H1')
    check(len(doc.ids) == len(set(doc.ids)), f'{label}: duplicate IDs')
    import re
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', p.read_text(), re.S):
        try: json.loads(raw)
        except ValueError: errors.append(f'{label}: invalid JSON-LD')
    for tag, a in doc.tags:
        for attr in ('href', 'src'):
            if attr not in a: continue
            u = urljoin(url(p), a[attr]); target = local(u)
            if target is None: continue
            check(target.is_file(), f'{label}: missing target {a[attr]}')
            fragment = unquote(urlsplit(u).fragment)
            if fragment and tag == 'a' and target in pages:
                check(fragment in pages[target].ids, f'{label}: missing anchor {a[attr]}')
    if not indexed: continue
    check(bool(doc.title) and doc.title not in titles, f'{label}: duplicate/missing title'); titles.add(doc.title)
    desc = doc.meta('description')
    check(len(desc) == 1 and bool(desc[0]) and desc[0] not in descriptions, f'{label}: duplicate/missing description')
    if desc: descriptions.add(desc[0])
    check(doc.meta('og:title') == [doc.title], f'{label}: social title mismatch')
    check(doc.meta('twitter:description') == desc, f'{label}: social description mismatch')
    check(all('noindex' not in v for v in doc.meta('robots')), f'{label}: unexpected noindex')
    check([a['href'] for a in doc.links('canonical')] == [url(p)], f'{label}: incorrect canonical')
    canonical_pages.add(url(p))
    alternatives = {a['hreflang']: a['href'] for a in doc.links('alternate') if 'hreflang' in a}
    check(set(alternatives) == {'en', 'ar', 'x-default'}, f'{label}: incomplete language alternatives')
    for lang in ('en', 'ar'):
        target = local(alternatives.get(lang, ''))
        if target not in pages: errors.append(f'{label}: missing {lang} alternative'); continue
        reciprocal = {a['hreflang']: a['href'] for a in pages[target].links('alternate') if 'hreflang' in a}
        check(reciprocal == alternatives, f'{label}: nonreciprocal hreflang')

ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap = ET.parse(ROOT / 'sitemap.xml')
locations = [e.text for e in sitemap.findall('s:url/s:loc', ns)]
check(set(locations) == canonical_pages, 'sitemap does not match canonical indexable pages')
check(len(locations) == len(set(locations)), 'duplicate sitemap URLs')
ET.parse(ROOT / 'feed.xml')
if errors:
    print('\n'.join(errors)); raise SystemExit(1)
print(f'PASS: {len(pages)} HTML pages; {len(canonical_pages)} indexable URLs; local links, anchors, JSON-LD, metadata, reciprocal hreflang, sitemap and RSS XML.')
