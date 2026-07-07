import type { NormalizedTender } from './types/tender';
import { sha256Base64 } from './lib/hash';

function stableStringify(value: unknown) {
  return JSON.stringify(value, Object.keys(value as any).sort());
}

export function withContentHash(tender: NormalizedTender): NormalizedTender {
  const key = stableStringify({
    title: tender.title,
    description: tender.description ?? '',
    publisher: tender.publisher ?? '',
    publicationDate: tender.publicationDate ?? '',
    submissionDeadline: tender.submissionDeadline ?? '',
    status: tender.status ?? '',
    documents: tender.documents ?? [],
  });
  return { ...tender, contentHash: sha256Base64(key) };
}

