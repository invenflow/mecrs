import pLimit from 'p-limit';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml, parseHebrewDate } from '../../lib/htmlDetail';

const LIST_PAGES = [
  'https://www.clalit.co.il/he/info/tenders/Pages/mkomi_hospital.aspx',
  'https://www.clalit.co.il/he/info/tenders/Pages/public_binui.aspx',
  'https://www.clalit.co.il/he/info/tenders/Pages/mkomi_mhozot.aspx',
];

function parseTenderBlocks(text: string): Array<{
  title: string;
  description?: string;
  publicationDate?: string;
  submissionDeadline?: string;
}> {
  const cleaned = text.replace(/\r/g, '');
  const blocks: string[] = cleaned
    .split(/={10,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: Array<{
    title: string;
    description?: string;
    publicationDate?: string;
    submissionDeadline?: string;
  }> = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const titleLine = lines.find((l) => l.startsWith('מכרז')) ?? lines[0];
    if (!titleLine || !titleLine.startsWith('מכרז')) continue;

    const publicationLine = lines.find((l) => l.includes('תאריך פרסום'));
    const deadlineLine = lines.find((l) => l.includes('מועד אחרון להגשת הצעות'));
    const description = lines
      .filter(
        (l) =>
          l !== titleLine &&
          !l.includes('תאריך פרסום') &&
          !l.includes('מועד אחרון להגשת הצעות') &&
          l.length > 8,
      )
      .slice(0, 3)
      .join(' · ');

    const publicationDate = publicationLine ? parseHebrewDate(publicationLine) : undefined;
    const submissionDeadline = deadlineLine ? parseHebrewDate(deadlineLine) : undefined;

    results.push({ title: titleLine, description: description || undefined, publicationDate, submissionDeadline });
  }

  return results;
}

export function clalitAdapter(): TenderAdapter {
  return {
    source: 'health_clalit',
    async fetch() {
      const limit = pLimit(3);
      const pages = await Promise.all(
        LIST_PAGES.map((url) =>
          limit(async () => {
            const html = await fetchHtml(url);
            // Avoid fragile DOM selectors; Clalit pages are largely text blocks.
            const text = html.replace(/<script[\s\S]*?<\/script>/gi, '\n').replace(/<style[\s\S]*?<\/style>/gi, '\n');
            return { url, text };
          }),
        ),
      );

      const tenders: NormalizedTender[] = [];
      for (const p of pages) {
        const blocks = parseTenderBlocks(p.text);
        for (const b of blocks) {
          const externalId = `${p.url}#${encodeURIComponent(b.title)}`;
          tenders.push({
            externalId,
            source: 'health_clalit',
            sourceUrl: externalId,
            title: b.title,
            description: b.description ?? '',
            publisher: 'שירותי בריאות כללית',
            tenderType: 'health',
            status: 'open',
            publicationDate: b.publicationDate,
            submissionDeadline: b.submissionDeadline,
            rawData: { page: p.url },
          });
        }
      }

      return { tenders };
    },
  };
}

