import { request } from 'undici';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.maccabi4u.co.il${href}`;
  return `https://www.maccabi4u.co.il/${href}`;
}

export function maccabiAdapter(): TenderAdapter {
  return {
    source: 'health_maccabi',
    async fetch() {
      const listUrl = 'https://www.maccabi4u.co.il/bids/';
      const res = await request(listUrl, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`Maccabi HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const links = $('a[href]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((h) => h.includes('/bids/') && h !== '/bids/');

      const uniq = Array.from(new Set(links)).slice(0, 150);
      for (const href of uniq) {
        const url = absoluteUrl(href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
          .first()
          .text()
          .trim();
        tenders.push({
          externalId: url,
          source: 'health_maccabi',
          sourceUrl: url,
          title: title || 'מכרז מכבי',
          publisher: 'מכבי שירותי בריאות',
          tenderType: 'health',
          status: 'open',
          rawData: { href },
        });
      }

      return { tenders };
    },
  };
}

