import { request } from 'undici';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';
import { fetchHtml, guessDatesFromHtml } from '../lib/htmlDetail';

type AnyRecord = Record<string, any>;

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://mr.gov.il${href}`;
  return `https://mr.gov.il/${href}`;
}

function asIsoDateTime(value: string | undefined) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// Minimal, resilient scraper for mr.gov.il storefront search results.
export function mrGovAdapter(): TenderAdapter {
  return {
    source: 'mr_gov',
    async fetch() {
      const tenders: NormalizedTender[] = [];

      const base = new URL('https://mr.gov.il/ilgstorefront/he/search/');
      base.searchParams.set('q', ':updateDate:archive:false&text=&s=TENDER');

      const res = await request(base, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`mr.gov.il HTTP ${res.statusCode}`);
      }
      const html = await res.body.text();
      const $ = cheerio.load(html);

      // Card-ish items contain a link to /p/{id}
      const links = $('a[href*="/ilgstorefront/he/p/"]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter(Boolean);

      const uniq = Array.from(new Set(links)).slice(0, 200); // safety cap

      const limit = pLimit(5);
      const items = await Promise.all(
        uniq.map((href) =>
          limit(async () => {
            const url = absoluteUrl(href);
            const idMatch = url.match(/\/p\/([^/?#]+)/);
            const externalId = idMatch?.[1] ?? url;

            // Best-effort title from link text
            const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]')
              .first()
              .text()
              .trim();

            const detailHtml = await fetchHtml(url);
            const { publicationDate, submissionDeadline } = guessDatesFromHtml(detailHtml);

            const tender: NormalizedTender = {
              externalId,
              source: 'mr_gov',
              sourceUrl: url,
              title: title || `מכרז ${externalId}`,
              publisher: 'מינהל הרכש הממשלתי',
              tenderType: 'public',
              status: 'open',
              publicationDate: publicationDate ?? asIsoDateTime(undefined),
              submissionDeadline,
              rawData: { href },
            };

            return tender;
          }),
        ),
      );

      for (const t of items) {
        tenders.push(t);
      }

      return { tenders };
    },
  };
}

