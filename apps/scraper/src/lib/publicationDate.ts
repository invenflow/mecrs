import type { NormalizedTender } from '../types/tender';
import { z } from 'zod';

const MinPublicationDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .optional();

function parseMinPublicationDate(): Date {
  const raw = MinPublicationDateSchema.safeParse(process.env.MIN_PUBLICATION_DATE);
  const value = raw.success ? raw.data : undefined;
  const fallback = '2026-01-01T00:00:00+02:00';
  const dt = new Date(value && value.length > 0 ? value : fallback);
  return Number.isNaN(dt.getTime()) ? new Date(fallback) : dt;
}

export const MIN_PUBLICATION_DATE: Date = parseMinPublicationDate();

export function isPublishedAfterMin(publicationDate?: string | null): boolean {
  if (!publicationDate) return false;
  const d = new Date(publicationDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= MIN_PUBLICATION_DATE.getTime();
}

export function filterByMinPublicationDate(tenders: NormalizedTender[]): {
  kept: NormalizedTender[];
  skippedOld: number;
  skippedNoDate: number;
} {
  let skippedOld = 0;
  let skippedNoDate = 0;
  const kept: NormalizedTender[] = [];

  for (const t of tenders) {
    if (!t.publicationDate) {
      skippedNoDate += 1;
      continue;
    }
    const d = new Date(t.publicationDate);
    if (Number.isNaN(d.getTime())) {
      skippedNoDate += 1;
      continue;
    }
    if (d.getTime() < MIN_PUBLICATION_DATE.getTime()) {
      skippedOld += 1;
      continue;
    }
    kept.push(t);
  }

  return { kept, skippedOld, skippedNoDate };
}

