import { request } from 'undici';
import { z } from 'zod';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';

const CkanResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    records: z.array(z.record(z.any())),
  }),
});

type AnyRecord = Record<string, any>;

function asIsoDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function guessTitle(r: AnyRecord) {
  return (
    (typeof r.description === 'string' && r.description) ||
    (typeof r.purpose === 'string' && r.purpose) ||
    (typeof r.subject === 'string' && r.subject) ||
    'התקשרות / פטור'
  );
}

export function dataGovAdapter(resourceId: string): TenderAdapter {
  return {
    source: 'data_gov',
    async fetch() {
      const url = new URL('https://data.gov.il/api/3/action/datastore_search');
      url.searchParams.set('resource_id', resourceId);
      url.searchParams.set('limit', '1000');

      const res = await request(url, {
        headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
      });
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`data.gov.il HTTP ${res.statusCode}`);
      }
      const json = await res.body.json();
      const parsed = CkanResponseSchema.safeParse(json);
      if (!parsed.success || parsed.data.success !== true) {
        throw new Error('data.gov.il invalid response');
      }

      const tenders: NormalizedTender[] = [];
      for (const rec of parsed.data.result.records) {
        const externalId =
          (typeof rec._id === 'number' && String(rec._id)) ||
          (typeof rec.id === 'string' && rec.id) ||
          undefined;
        if (!externalId) continue;

        const sourceUrl = url.toString();
        tenders.push({
          externalId,
          source: 'data_gov',
          sourceUrl,
          title: guessTitle(rec),
          description: typeof rec.description === 'string' ? rec.description : undefined,
          publisher:
            (typeof rec.publisher === 'string' && rec.publisher) ||
            (typeof rec.ministry === 'string' && rec.ministry) ||
            undefined,
          tenderType: 'exemption',
          status: 'awarded',
          publicationDate: asIsoDateTime(rec.date ?? rec.publish_date ?? rec.publication_date),
          estimatedValue: typeof rec.amount === 'number' ? rec.amount : typeof rec.volume === 'number' ? rec.volume : undefined,
          rawData: rec,
        });
      }

      return { tenders };
    },
  };
}

