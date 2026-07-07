import { request } from 'undici';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';

type AnyRecord = Record<string, any>;

function asIsoDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function rmiAdapter(): TenderAdapter {
  return {
    source: 'rmi',
    async fetch() {
      // RMI uses a search endpoint that requires specific headers.
      const url = new URL('https://apps.land.gov.il/MichrazimSite/api/SearchApi/Search');
      const headers = {
        'user-agent': 'datagov-external-client',
        'content-type': 'application/json',
        origin: 'https://apps.land.gov.il',
        referer: 'https://apps.land.gov.il/MichrazimSite/',
      };

      const res = await request(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          page: 1,
          pageSize: 200,
          freeText: '',
          status: null,
          michrazType: null,
          yishuv: null,
          area: null,
        }),
      });

      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`RMI HTTP ${res.statusCode}`);
      }

      const json = (await res.body.json()) as AnyRecord;
      const items: AnyRecord[] = Array.isArray(json?.Results)
        ? json.Results
        : Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json)
            ? (json as AnyRecord[])
            : [];

      const tenders: NormalizedTender[] = [];
      for (const it of items) {
        const id = String(it?.MichrazId ?? it?.Id ?? it?.TenderId ?? '');
        if (!id) continue;
        const sourceUrl = `https://apps.land.gov.il/MichrazimSite/#/michraz/${encodeURIComponent(id)}`;

        tenders.push({
          externalId: id,
          source: 'rmi',
          sourceUrl,
          title: String(it?.MichrazName ?? it?.Title ?? it?.Name ?? `מכרז ${id}`),
          description: typeof it?.Description === 'string' ? it.Description : undefined,
          publisher: 'רשות מקרקעי ישראל',
          tenderType: 'land',
          status: typeof it?.Status === 'string' ? it.Status : undefined,
          publicationDate: asIsoDateTime(it?.PublishDate ?? it?.PublicationDate),
          submissionDeadline: asIsoDateTime(it?.LastDate ?? it?.SubmissionDeadline),
          location: typeof it?.YishuvName === 'string' ? it.YishuvName : undefined,
          rawData: it,
        });
      }

      return { tenders };
    },
  };
}

