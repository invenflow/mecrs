import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, parseHebrewDate } from '../../lib/htmlDetail';
import * as cheerio from 'cheerio';

function parseMekorotList(text: string): Array<{
  tenderNo: string;
  title: string;
  publicationDate?: string;
  submissionDeadline?: string;
}> {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const items = cleaned.split('מספר מכרז:').slice(1);
  const out: Array<{ tenderNo: string; title: string; publicationDate?: string; submissionDeadline?: string }> = [];

  for (const chunk of items) {
    const tenderNo = chunk.trim().split(' ')[0]?.trim();
    if (!tenderNo) continue;

    const nameMatch = chunk.match(/שם מכרז:\s*([^]+?)\s*תאריך פרסום:/);
    const title = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : `מכרז ${tenderNo}`;

    const pubMatch = chunk.match(/תאריך פרסום:\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{2,4})/);
    const deadlineMatch = chunk.match(/מועד אחרון להגשת הצעה:\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{2,4})/);

    out.push({
      tenderNo,
      title,
      publicationDate: pubMatch ? parseHebrewDate(pubMatch[1]) : undefined,
      submissionDeadline: deadlineMatch ? parseHebrewDate(deadlineMatch[1]) : undefined,
    });
  }

  return out;
}

export function mekorotAdapter(): TenderAdapter {
  return {
    source: 'soe_mekorot',
    async fetch() {
      const listUrl = 'https://www.emsmekorotprojects.co.il/auction/';
      const html = await fetchHtml(listUrl);
      const text = cheerio.load(html)('body').text();
      const items = parseMekorotList(text);

      const tenders: NormalizedTender[] = items.map((it) => {
        const sourceUrl = `${listUrl}#${encodeURIComponent(it.tenderNo)}`;
        return {
          externalId: it.tenderNo,
          source: 'soe_mekorot',
          sourceUrl,
          title: it.title,
          description: `מכרז מס׳ ${it.tenderNo}`,
          publisher: 'שח\"מ מקורות ביצוע',
          tenderType: 'soe',
          status: 'open',
          publicationDate: it.publicationDate,
          submissionDeadline: it.submissionDeadline,
          rawData: { tenderNo: it.tenderNo, listUrl },
        };
      });

      return { tenders };
    },
  };
}

