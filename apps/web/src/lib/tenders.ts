/** ISO timestamp for Supabase filters: deadline is null or still open for submission. */
export function submittableDeadlineFilter(now = new Date()): string {
  return `submission_deadline.is.null,submission_deadline.gte.${now.toISOString()}`;
}

export function isSubmittable(submissionDeadline: string | null | undefined): boolean {
  if (!submissionDeadline) return true;
  const deadline = new Date(submissionDeadline);
  if (Number.isNaN(deadline.getTime())) return true;
  return deadline.getTime() >= Date.now();
}

/** Inclusive publication-year range for filtering (UTC boundaries). */
export function publicationYearRange(year: number): { from: string; to: string } {
  return {
    from: `${year}-01-01T00:00:00.000Z`,
    to: `${year + 1}-01-01T00:00:00.000Z`,
  };
}

export function minPublicationDate(now = new Date()): string {
  const raw = process.env.MIN_PUBLICATION_DATE;
  if (raw && raw.length > 0) return raw;
  const year = Math.max(2026, now.getFullYear());
  return `${year}-01-01T00:00:00+02:00`;
}

export function buildYearOptions(count = 15, now = new Date()): number[] {
  const current = now.getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}
