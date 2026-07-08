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
