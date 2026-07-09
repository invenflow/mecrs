import * as cheerio from 'cheerio';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, guessDatesFromHtml } from '../../lib/htmlDetail';

function absoluteUrl(base: string, href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `${base}${href}`;
  return `${base}/${href}`;
}

export function iecAdapter(): TenderAdapter {
  return {
    source: 'soe_iec',
    async fetch() {
      const primary = 'https://www.iec.co.il/content/suppliers/tenders-and-decisions/tenders/active-tenders';
      let html = await fetchHtml(primary);

      // When blocked, the page usually contains a special link for tenders from abroad.
      if (/blocked from outside of israel/i.test(html) || html.includes('חסום לגלישה מחו״ל')) {
        const $ = cheerio.load(html);
        const altHref =
          $('a[href]').map((_i, el) => String($(el).attr('href') ?? '')).get().find((h) => h.includes('tenders')) ??
          '';
        if (altHref) {
          html = await fetchHtml(absoluteUrl('https://www.iec.co.il', altHref));
        }
      }

      const $ = cheerio.load(html);
      const links = $('a[href]')
        .map((_i, el) => String($(el).attr('href') ?? ''))
        .get()
        .filter((h) => h.includes('tender') || h.includes('מכרז') || h.includes('tenders'));

      const uniq = Array.from(new Set(links)).slice(0, 200);
      const tenders: NormalizedTender[] = [];

      for (const href of uniq) {
        const url = absoluteUrl('https://www.iec.co.il', href);
        const title = $('a[href="' + href.replace(/"/g, '\\"') + '"]').first().text().trim();

        let publicationDate: string | undefined;
        let submissionDeadline: string | undefined;
        try {
          const detailHtml = await fetchHtml(url);
          const dates = guessDatesFromHtml(detailHtml);
          publicationDate = dates.publicationDate;
          submissionDeadline = dates.submissionDeadline;
        } catch {
          // Best-effort: ignore detail failures.
        }

        tenders.push({
          externalId: url,
          source: 'soe_iec',
          sourceUrl: url,
          title: title || 'מכרז חברת החשמל',
          publisher: 'חברת החשמל לישראל',
          tenderType: 'soe',
          status: 'open',
          publicationDate,
          submissionDeadline,
          rawData: { href, primary },
        });
      }

      return { tenders };
    },
  };
}

