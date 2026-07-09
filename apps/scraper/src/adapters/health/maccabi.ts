import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, parseHebrewDate } from '../../lib/htmlDetail';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.maccabi4u.co.il${href}`;
  return `https://www.maccabi4u.co.il/${href}`;
}

function extractLabeledDate(text: string, label: string): string | undefined {
  const re = new RegExp(`${label}\\s*:?\\s*([\\d./\\s:]+(?:בשעה\\s+[\\d:]+)?)`, 'i');
  const match = text.match(re);
  if (!match?.[1]) return undefined;
  return parseHebrewDate(match[1].replace(/\s*בשעה\s*/g, ' ').trim());
}

export function maccabiAdapter(): TenderAdapter {
  return {
    source: 'health_maccabi',
    async fetch() {
      const listUrl = 'https://www.maccabi4u.co.il/bids/';
      const html = await fetchHtml(listUrl);
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const items = $('.michrazim-item')
        .not('.michrazim-item-disable')
        .toArray()
        .slice(0, 200);

      for (const el of items) {
        const $el = $(el);
        const title =
          $el.find('h2, h3, .michrazim-item-title').first().text().trim() ||
          $el.text().trim().split('\n')[0]?.trim();
        if (!title) continue;

        const details = $el.find('.michrazim-item-details').text().replace(/\s+/g, ' ').trim();
        const publicationDate = extractLabeledDate(details, 'מועד פרסום');
        const submissionDeadline = extractLabeledDate(details, 'מועד אחרון להגשה');

        const pdfHref = String($el.find('a[href^="/media/"]').first().attr('href') ?? '');
        const sourceUrl = pdfHref ? absoluteUrl(pdfHref) : listUrl;

        tenders.push({
          externalId: pdfHref || `${title}:${publicationDate ?? ''}`,
          source: 'health_maccabi',
          sourceUrl,
          title,
          description: details || '',
          publisher: 'מכבי שירותי בריאות',
          tenderType: 'health',
          status: 'open',
          publicationDate,
          submissionDeadline,
          rawData: { pdfHref, details, listUrl },
        });
      }

      return { tenders };
    },
  };
}
