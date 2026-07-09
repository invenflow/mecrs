/** Build a readable description from BudgetKey / OpenBudget document fields. */
export function buildBudgetkeyDescription(doc: Record<string, any>, title: string): string {
  const clean = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const s = value.replace(/\s+/g, ' ').trim();
    if (!s || s === '-' || s === '—') return '';
    return s;
  };

  const parts: string[] = [];

  const subjects = clean(doc.subjects);
  if (subjects) parts.push(`תחום: ${subjects}`);

  const tenderTypeHe = clean(doc.tender_type_he);
  if (tenderTypeHe) parts.push(tenderTypeHe);

  const reason = clean(doc.reason);
  const regulation = clean(doc.regulation);
  if (reason) parts.push(reason);
  else if (regulation && regulation !== reason) parts.push(regulation);

  const unit = clean(doc.publisher_unit);
  if (unit) parts.push(`יחידה: ${unit}`);

  const tenderId = clean(doc.tender_id);
  if (tenderId) parts.push(`מס׳ ${tenderId}`);

  const rawDesc = clean(doc.description);
  // Prefer a longer/different description body when available; otherwise use metadata parts.
  if (rawDesc && rawDesc !== title && rawDesc.length > title.length + 10) {
    return [rawDesc, ...parts].filter(Boolean).join(' · ');
  }

  return parts.join(' · ');
}
