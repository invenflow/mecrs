import { request } from 'undici';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';

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
      const res = await request(listUrl, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`IAA HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const links = $('a')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((h) => h.includes('/tenders') || h.includes('/tender') || h.includes('tenders'));

      const uniq = Array.from(new Set(links)).slice(0, 150);
      for (const href of uniq) {
        const url = absoluteUrl(href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
          .first()
          .text()
          .trim();
        tenders.push({
          externalId: url,
          source: 'soe_iaa',
          sourceUrl: url,
          title: title || 'מכרז רשות שדות התעופה',
          publisher: 'רשות שדות התעופה',
          tenderType: 'soe',
          status: 'open',
          rawData: { href },
        });
      }

      return { tenders };
    },
  };
}

