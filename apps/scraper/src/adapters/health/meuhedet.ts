import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, parseHebrewDate } from '../../lib/htmlDetail';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://k.meuhedet.co.il${href}`;
  return `https://k.meuhedet.co.il/${href}`;
}

function extractLeadingDate(text: string): string | undefined {
  // Many Meuhedet posts start with: "11 בנובמבר 2025 ..."
  const m = text.match(/^\s*([0-9]{1,2}\s+[א-ת]+\s+[0-9]{4})\b/);
  if (!m) return undefined;
  return parseHebrewDate(m[1]);
}

export function meuhedetAdapter(): TenderAdapter {
  return {
    source: 'health_meuhedet',
    async fetch() {
      const listUrl = 'https://k.meuhedet.co.il/%D7%9E%D7%9B%D7%A8%D7%96%D7%99%D7%9D/%D7%91%D7%A7%D7%A9%D7%94-%D7%9C%D7%A7%D7%91%D7%9C%D7%AA-%D7%9E%D7%99%D7%93%D7%A2/';
      const listHtml = await fetchHtml(listUrl);
      const $ = cheerio.load(listHtml);

      const links = $('a[href]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((h) => h.includes('/%D7%9E%D7%9B%D7%A8%D7%96%D7%99%D7%9D/') || h.includes('/מכרזים/'));

      const uniq = Array.from(new Set(links))
        .map(absoluteUrl)
        .filter((u) => u.startsWith('https://k.meuhedet.co.il/'))
        .slice(0, 200);

      const limit = pLimit(5);
      const tenders = await Promise.all(
        uniq.map((url) =>
          limit(async () => {
            const html = await fetchHtml(url);
            const $$ = cheerio.load(html);
            const title = $$('h1').first().text().trim() || 'פרסום מאוחדת';
            const bodyText = $$('.entry-content, main, body').first().text().replace(/\s+/g, ' ').trim();
            const publicationDate = extractLeadingDate(bodyText) || extractLeadingDate(title);

            const tender: NormalizedTender = {
              externalId: url,
              source: 'health_meuhedet',
              sourceUrl: url,
              title,
              publisher: 'קופת חולים מאוחדת',
              tenderType: 'health',
              status: 'open',
              publicationDate,
              rawData: { url },
            };
            return tender;
          }),
        ),
      );

      return { tenders };
    },
  };
}

