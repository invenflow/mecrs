import { request } from 'undici';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://bids.dekel.co.il${href}`;
  return `https://bids.dekel.co.il/${href}`;
}

export function dekelAdapter(): TenderAdapter {
  return {
    source: 'dekel',
    async fetch() {
      const res = await request('https://bids.dekel.co.il/', {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`Dekel HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      // Dekel has multiple portals; this adapter is a generic best-effort discovery
      // of tender item pages.
      const links = $('a[href*="Item.aspx"], a[href*="item.aspx"]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter(Boolean);

      const tenders: NormalizedTender[] = [];
      const uniq = Array.from(new Set(links)).slice(0, 200);
      for (const href of uniq) {
        const url = absoluteUrl(href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
          .first()
          .text()
          .trim();
        tenders.push({
          externalId: url,
          source: 'dekel',
          sourceUrl: url,
          title: title || 'מכרז (דקל)',
          publisher: 'דקל',
          tenderType: 'municipal',
          status: 'open',
          rawData: { href },
        });
      }

      return { tenders };
    },
  };
}

