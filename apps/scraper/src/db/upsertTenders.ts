import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedTender } from '../types/tender';
import { filterSubmittableTenders } from '../lib/submittable';
import { filterByMinPublicationDate } from '../lib/publicationDate';

export async function upsertTenders(
  supabase: SupabaseClient,
  tenders: NormalizedTender[],
) {
  const byDate = filterByMinPublicationDate(tenders);
  const submittable = filterSubmittableTenders(byDate.kept);
  const skippedExpired = byDate.kept.length - submittable.length;
  if (submittable.length === 0) {
    return {
      upserted: 0,
      skippedExpired,
      skippedOld: byDate.skippedOld,
      skippedNoDate: byDate.skippedNoDate,
    };
  }

  tenders = submittable;

  const now = new Date().toISOString();
  // Deduplicate within the same run by source_url to avoid "ON CONFLICT ... a second time"
  const byUrl = new Map<string, NormalizedTender>();
  for (const t of tenders) byUrl.set(t.sourceUrl, t);

  const rows = Array.from(byUrl.values()).map((t) => ({
    external_id: t.externalId,
    source: t.source,
    source_url: t.sourceUrl,
    title: t.title,
    description: t.description ?? '',
    publisher: t.publisher ?? null,
    tender_type: t.tenderType ?? null,
    status: t.status ?? null,
    category: t.category ?? null,
    publication_date: t.publicationDate ?? null,
    submission_deadline: t.submissionDeadline ?? null,
    opening_date: t.openingDate ?? null,
    estimated_value: t.estimatedValue ?? null,
    currency: t.currency ?? 'ILS',
    location: t.location ?? null,
    contact_name: t.contactName ?? null,
    contact_email: t.contactEmail ?? null,
    contact_phone: t.contactPhone ?? null,
    documents: t.documents ?? [],
    raw_data: t.rawData ?? null,
    content_hash: t.contentHash ?? null,
    first_seen_at: now,
    last_updated_at: now,
    is_active: true,
  }));

  // Upsert in chunks to avoid PostgREST / statement timeouts.
  const chunkSize = 200;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('tenders')
      .upsert(chunk, { onConflict: 'source_url' });
    if (error) throw error;
    upserted += chunk.length;
  }
  return {
    upserted,
    skippedExpired,
    skippedOld: byDate.skippedOld,
    skippedNoDate: byDate.skippedNoDate,
  };
}

