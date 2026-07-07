import { request } from 'undici';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.tel-aviv.gov.il${href}`;
  return `https://www.tel-aviv.gov.il/${href}`;
}

export function telAvivAdapter(): TenderAdapter {
  return {
    source: 'muni_tel_aviv',
    async fetch() {
      const listUrl =
        'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Bids.aspx';
      const res = await request(listUrl, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`TelAviv HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const links = $('a[href*="Bids"], a[href*="bids"]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter(Boolean);

      const uniq = Array.from(new Set(links)).slice(0, 150);
      for (const href of uniq) {
        const url = absoluteUrl(href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
          .first()
          .text()
          .trim();
        tenders.push({
          externalId: url,
          source: 'muni_tel_aviv',
          sourceUrl: url,
          title: title || 'מכרז עיריית תל אביב-יפו',
          publisher: 'עיריית תל אביב-יפו',
          tenderType: 'municipal',
          status: 'open',
          rawData: { href },
        });
      }

      return { tenders };
    },
  };
}

