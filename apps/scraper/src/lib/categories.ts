import type { NormalizedTender } from '../types/tender';

/** Hebrew labels for internal tender-type codes set by adapters. */
const TENDER_TYPE_LABELS: Record<string, string> = {
  public: 'ממשלתי',
  defense: 'ביטחון',
  municipal: 'רשויות מקומיות',
  health: 'בריאות',
  land: 'קרקעות',
  soe: 'תאגיד ממשלתי',
  exemption: 'פטור ממכרז',
};

export function deriveCategories(tender: NormalizedTender): string[] | undefined {
  const cats = new Set<string>();

  for (const c of tender.category ?? []) {
    const trimmed = c.trim();
    if (trimmed) cats.add(trimmed);
  }

  if (tender.tenderType) {
    cats.add(TENDER_TYPE_LABELS[tender.tenderType] ?? tender.tenderType);
  }

  return cats.size > 0 ? Array.from(cats) : undefined;
}
