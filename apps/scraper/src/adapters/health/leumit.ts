import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, extractLabeledDateFromHtml } from '../../lib/htmlDetail';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.leumit.co.il${href}`;
  return `https://www.leumit.co.il/${href}`;
}

export function leumitAdapter(): TenderAdapter {
  return {
    source: 'health_leumit',
    async fetch() {
      const listUrl = 'https://www.leumit.co.il/bids/publictenders/';
      const listHtml = await fetchHtml(listUrl);
      const $ = cheerio.load(listHtml);

      const links = $('a[href]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((h) => h.includes('/bids/publictenders/') && h !== '/bids/publictenders/');

      const uniq = Array.from(new Set(links))
        .map(absoluteUrl)
        .filter((u) => u.startsWith('https://www.leumit.co.il/bids/publictenders/'))
        .slice(0, 200);

      const limit = pLimit(5);
      const tenders = await Promise.all(
        uniq.map((url) =>
          limit(async () => {
            const detailHtml = await fetchHtml(url);
            const title = (() => {
              const $$ = cheerio.load(detailHtml);
              const h1 = $$('h1').first().text().trim();
              return h1 || `מכרז לאומית`;
            })();

            const publicationDate =
              extractLabeledDateFromHtml(detailHtml, 'תאריך פרסום') ||
              extractLabeledDateFromHtml(detailHtml, 'תאריך פרסום:');
            const submissionDeadline =
              extractLabeledDateFromHtml(detailHtml, 'מועד אחרון להגשת הצעות') ||
              extractLabeledDateFromHtml(detailHtml, 'מועד אחרון להגשת ההצעות');

            const externalId = url;
            const tender: NormalizedTender = {
              externalId,
              source: 'health_leumit',
              sourceUrl: url,
              title,
              publisher: 'לאומית שירותי בריאות',
              tenderType: 'health',
              status: 'open',
              publicationDate,
              submissionDeadline,
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

