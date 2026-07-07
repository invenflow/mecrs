import { request } from 'undici';
import * as cheerio from 'cheerio';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.online.mod.gov.il${href}`;
  return `https://www.online.mod.gov.il/Online2016/Pages/General/Balam/${href}`;
}

export function modAdapter(): TenderAdapter {
  return {
    source: 'mod',
    async fetch() {
      const listUrl =
        'https://www.online.mod.gov.il/Online2016/Pages/General/Balam/BalamList.aspx';
      const res = await request(listUrl, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`MOD HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      const tenders: NormalizedTender[] = [];
      const links = $('a[href*="BalamDetails"], a[href*="BalamDetails.aspx"]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter(Boolean);

      const uniq = Array.from(new Set(links)).slice(0, 200);
      for (const href of uniq) {
        const url = absoluteUrl(href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
          .first()
          .text()
          .trim();
        const externalId = url;
        tenders.push({
          externalId,
          source: 'mod',
          sourceUrl: url,
          title: title || 'מכרז משרד הביטחון',
          publisher: 'משרד הביטחון',
          tenderType: 'defense',
          status: 'open',
          rawData: { href },
        });
      }

      return { tenders };
    },
  };
}

