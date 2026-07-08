import type { NormalizedTender } from '../types/tender';

/** True when the tender can still be submitted (no deadline or deadline in the future). */
export function isSubmittable(submissionDeadline?: string | null): boolean {
  if (!submissionDeadline) return true;
  const deadline = new Date(submissionDeadline);
  if (Number.isNaN(deadline.getTime())) return true;
  return deadline.getTime() >= Date.now();
}

export function filterSubmittableTenders(tenders: NormalizedTender[]): NormalizedTender[] {
  return tenders.filter((t) => isSubmittable(t.submissionDeadline));
}
