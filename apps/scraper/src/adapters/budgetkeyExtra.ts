import { request } from 'undici';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';
import { buildBudgetkeyDescription } from '../lib/budgetkeyDescription';
import { MIN_PUBLICATION_DATE } from '../lib/publicationDate';

type QueryResponse = {
  rows?: Record<string, any>[];
  success?: boolean;
  status?: number;
};

function asIsoDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toTender(source: string, doc: Record<string, any>): NormalizedTender | null {
  const sourceUrl = typeof doc.page_url === 'string' ? doc.page_url : undefined;
  const externalId =
    ((typeof doc.publication_id === 'number' || typeof doc.publication_id === 'string') &&
      String(doc.publication_id)) ||
    (typeof doc.tender_id === 'string' && doc.tender_id) ||
    sourceUrl;

  if (!sourceUrl || !externalId) return null;

  const documents: { name: string; url: string; type?: string }[] = [];
  if (Array.isArray(doc.documents)) {
    for (const d of doc.documents) {
      const url = d?.url ?? d?.link;
      const name = d?.description ?? d?.name;
      if (d && typeof url === 'string' && typeof name === 'string') {
        documents.push({ name, url });
      }
    }
  }

  const title = String(doc.description ?? doc.page_title ?? doc.title ?? externalId);

  return {
    externalId,
    source,
    sourceUrl,
    title,
    description: buildBudgetkeyDescription(doc, title),
    publisher: typeof doc.publisher === 'string' ? doc.publisher : undefined,
    tenderType: typeof doc.tender_type === 'string' ? doc.tender_type : undefined,
    status:
      typeof doc.status === 'string'
        ? doc.status
        : typeof doc.decision === 'string'
          ? doc.decision
          : undefined,
    publicationDate: asIsoDateTime(doc.publication_date ?? doc.start_date ?? doc.claim_date),
    submissionDeadline: asIsoDateTime(doc.submission_deadline ?? doc.end_date ?? doc.deadline),
    estimatedValue: typeof doc.volume === 'number' ? doc.volume : undefined,
    documents,
    rawData: doc,
  };
}

async function fetchAllFromQueryApi(table: string) {
  const results: Record<string, any>[] = [];
  const pageSize = 1000;
  const maxResults = Number(process.env.BUDGETKEY_MAX_RESULTS ?? '20000') || 20000;
  const minIsoDate = MIN_PUBLICATION_DATE.toISOString().slice(0, 10); // YYYY-MM-DD

  for (let offset = 0; offset < maxResults; offset += pageSize) {
    const sql = `SELECT * FROM ${table} WHERE publication_date >= '${minIsoDate}' ORDER BY publication_id DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const url = `https://next.obudget.org/api/query?query=${encodeURIComponent(sql)}`;

    const res = await request(url, {
      headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
    });
    const bodyText = await res.body.text();
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // BudgetKey query API returns UndefinedTable in body when table doesn't exist.
      if (bodyText.includes('UndefinedTable')) return [];
      throw new Error(`BudgetKey query ${table} HTTP ${res.statusCode}: ${bodyText.slice(0, 200)}`);
    }

    const json = JSON.parse(bodyText) as QueryResponse;
    const batch = Array.isArray(json.rows) ? json.rows : [];
    results.push(...batch);

    if (batch.length < pageSize) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  return results;
}

function budgetKeyTableAdapter(source: string, table: string): TenderAdapter {
  return {
    source,
    async fetch() {
      const rows = await fetchAllFromQueryApi(table);
      const tenders: NormalizedTender[] = [];
      for (const doc of rows) {
        const t = toTender(source, doc);
        if (t) tenders.push(t);
      }
      return { tenders };
    },
  };
}

export function budgetKeyMofAdapter(): TenderAdapter {
  return budgetKeyTableAdapter('budgetkey_mof', 'mof_tenders');
}

export function budgetKeyMrGovTableAdapter(): TenderAdapter {
  return budgetKeyTableAdapter('budgetkey_mr_gov', 'tenders_mr_gov');
}

