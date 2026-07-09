import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, joinDescriptionParts, parseHebrewDate } from '../../lib/htmlDetail';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.iaa.gov.il${href}`;
  return `https://www.iaa.gov.il/${href}`;
}

export function iaaAdapter(): TenderAdapter {
  return {
    source: 'soe_iaa',
    async fetch() {
      const listUrl =
        'https://www.iaa.gov.il/tenders-and-contracts/active-tenders/';
      const html = await fetchHtml(listUrl);
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const rows = $('table tr').toArray();
      for (const row of rows) {
        const $row = $(row);
        const linkEl = $row.find('a[href]').first();
        const href = String(linkEl.attr('href') ?? '').trim();
        if (!href) continue;

        const url = absoluteUrl(href);
        const rowText = $row.text().replace(/\s+/g, ' ').trim();
        const title = linkEl.text().trim() || rowText.split('|')[0]?.trim() || 'מכרז רשות שדות התעופה';

        const pub = (() => {
          const m = rowText.match(/תאריך\s+פרסום\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/);
          return m ? parseHebrewDate(m[1]) : undefined;
        })();
        const deadline = (() => {
          const m = rowText.match(/תאריך\s+אחרון\s+להגשה\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/);
          return m ? parseHebrewDate(m[1]) : undefined;
        })();

        const cells = $row
          .find('td')
          .map((_i, el) => $(el).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter(Boolean);
        const extra = cells.filter((c) => c !== title && !/תאריך|הגשה|פרסום/i.test(c)).slice(0, 2);

        tenders.push({
          externalId: url,
          source: 'soe_iaa',
          sourceUrl: url,
          title,
          description: joinDescriptionParts(extra),
          publisher: 'רשות שדות התעופה',
          tenderType: 'soe',
          status: 'open',
          publicationDate: pub,
          submissionDeadline: deadline,
          rawData: { href, listUrl, rowText },
        });
      }

      return { tenders };
    },
  };
}

