"""Offline contract checks for the public guide; never fetch live services."""
import importlib.util
import json
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build_redevelopment.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class RedevelopmentTests(unittest.TestCase):
    def setUp(self):
        self.data = builder.load_data()

    def test_source_dates_and_milestones_do_not_claim_future_as_actual(self):
        for project in self.data['projects']:
            self.assertLessEqual(project['checkedAt'], self.data['updatedAt'])
            for milestone in project['milestones']:
                if milestone['kind'] == 'actual' and re.fullmatch(r'\d{4}-\d{2}-\d{2}', milestone['date']):
                    self.assertLessEqual(milestone['date'], project['checkedAt'], project['id'])
            for source in project['officialSources']:
                url = urlsplit(source['url'])
                self.assertEqual(url.scheme, 'https')
                self.assertIsNone(url.username)
                self.assertIsNone(url.password)

    def test_seasons_and_fiscal_years_are_not_lexicographic(self):
        dates = ['2027-07-01', '2027年春', '2027年秋', '2027-01-01', '2027年度']
        self.assertEqual(sorted(dates, key=builder.date_sort), ['2027-01-01', '2027年春', '2027年度', '2027-07-01', '2027年秋'])

    def test_no_javascript_reader_gets_every_project_and_official_source(self):
        hub = (ROOT / 'redevelopment/index.html').read_text()
        self.assertEqual(hub.count('class="project-card"'), len(self.data['projects']))
        for p in self.data['projects']:
            document = (ROOT / 'redevelopment' / p['id'] / 'index.html').read_text()
            self.assertIn(builder.e(p['schedule']), document)
            self.assertIn(builder.e(p['uncertainty']), document)
            for source in p['officialSources']:
                self.assertIn('href="' + builder.e(source['url']) + '"', document)

    def test_data_embedded_in_hub_matches_editorial_source(self):
        hub = (ROOT / 'redevelopment/index.html').read_text()
        embedded = re.search(r'<script type="application/json" id="redevelopment-data">(.*?)</script>', hub, re.S).group(1)
        self.assertEqual(json.loads(embedded), self.data)

    def test_sitemap_contains_one_canonical_per_guide_page(self):
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [n.text for n in ET.parse(ROOT / 'sitemap.xml').findall('.//s:loc', ns)]
        self.assertEqual(len(urls), len(set(urls)))
        for suffix in [''] + [p['id'] + '/' for p in self.data['projects']]:
            self.assertIn(builder.ORIGIN + '/redevelopment/' + suffix, urls)
        self.assertNotIn(builder.ORIGIN + '/meieki/', urls)

    def test_public_build_has_no_incomplete_editorial_markers(self):
        for path in (ROOT / 'redevelopment').rglob('*.html'):
            content = path.read_text()
            self.assertNotRegex(content, r'\[CHECK:|TODO|容量制限|/private/tmp/|/Users/')
            self.assertEqual(len(re.findall(r'<h1(?:\s|>)', content)), 1)
            self.assertIn('/css/motion.css', content)


if __name__ == '__main__':
    unittest.main()
