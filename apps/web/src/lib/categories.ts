/** Known category labels (Hebrew) used when DB has no category values yet. */
export const KNOWN_CATEGORIES = [
  'ממשלתי',
  'ביטחון',
  'רשויות מקומיות',
  'בריאות',
  'קרקעות',
  'תאגיד ממשלתי',
  'פטור ממכרז',
] as const;

/** Maps filter label back to tender_type for records not yet backfilled with category[]. */
export const CATEGORY_TO_TENDER_TYPE: Record<string, string> = {
  ממשלתי: 'public',
  ביטחון: 'defense',
  'רשויות מקומיות': 'municipal',
  בריאות: 'health',
  קרקעות: 'land',
  'תאגיד ממשלתי': 'soe',
  'פטור ממכרז': 'exemption',
};

export function mergeCategoryOptions(dbCategories: string[] | null | undefined): string[] {
  const merged = new Set<string>(KNOWN_CATEGORIES);
  for (const c of dbCategories ?? []) {
    const trimmed = c.trim();
    if (trimmed) merged.add(trimmed);
  }
  return Array.from(merged).sort((a, b) => a.localeCompare(b, 'he'));
}
