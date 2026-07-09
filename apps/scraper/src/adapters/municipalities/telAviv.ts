import { request } from 'undici';
import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { parseHebrewDate } from '../../lib/htmlDetail';

const GET_TABLES_URL = 'https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables';
const LIST_ID = '63229773-ffac-4d47-9bb9-fde6614cd663';
const SITE_ID = '24aa409e-01ed-482e-b0ed-1956972addb1';
const WEB_ID = 'c572b9ed-c977-4a07-a430-6445afe1daba';
const VIEW_ACTIVE = '699c03e2-e570-404c-9cd9-bb041e986d41';
const VIEW_ARCHIVE = '3d5ca532-6896-4101-afc3-98199d58e9de';
const DEADLINE_FIELD = '_x05de__x05d5__x05e2__x05d3__x0020__x05d0__x05d7__x05e8__x05d5__x05df_';

type TlvField = { InternalName: string; Value: string };
type TlvItem = { Attachments?: string[]; Fields: TlvField[] };

function fieldValue(item: TlvItem, name: string): string {
  return String(item.Fields.find((f) => f.InternalName === name)?.Value ?? '').trim();
}

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.tel-aviv.gov.il${href}`;
  return `https://www.tel-aviv.gov.il/${href}`;
}

function parseLongUrl(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as { Url?: string };
    return parsed.Url ? absoluteUrl(parsed.Url) : undefined;
  } catch {
    return undefined;
  }
}

function publicationDateFromTenderId(tenderId: string): string | undefined {
  const match = tenderId.match(/(\d+)\/(\d{4})/);
  if (!match) return undefined;
  const year = Number(match[2]);
  if (year < 1900 || year > 2200) return undefined;
  return parseHebrewDate(`01/01/${year}`);
}

async function fetchTables(viewId: string, rowPaging: number): Promise<TlvItem[]> {
  const res = await request(GET_TABLES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
    },
    body: JSON.stringify({
      dataSource: {
        Fields: null,
        ItemdIds: [],
        ListContentTypes: ['מסמך', 'תיקיה'],
        ListId: LIST_ID,
        SiteId: SITE_ID,
        ViewId: viewId,
        WebId: WEB_ID,
      },
      dataSrcFullUrl: null,
      showTitle: true,
      title: 'רשימת מכרזים',
      filters: [],
      isDigitel: false,
      isTitleOgen: false,
      itemPageUrl: null,
      maxColToShow: 4,
      rowPaging,
      titleOgen: 'רשימת מכרזים',
    }),
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Tel Aviv GetTables HTTP ${res.statusCode} (view ${viewId})`);
  }
  const json = JSON.parse(await res.body.text()) as { items?: TlvItem[] };
  return json.items ?? [];
}

function itemToTender(item: TlvItem): NormalizedTender | undefined {
  const tenderId = fieldValue(item, 'TenderID');
  const title = fieldValue(item, 'LinkFilename').replace(/\.pdf$/i, '') || tenderId;
  if (!tenderId && !title) return undefined;

  const publicationDate = publicationDateFromTenderId(tenderId);
  const submissionDeadline = parseHebrewDate(fieldValue(item, DEADLINE_FIELD));

  const sourceUrl =
    parseLongUrl(fieldValue(item, 'longURL')) ||
    parseLongUrl(fieldValue(item, 'AuctionDocs')) ||
    (item.Attachments?.[0] ? absoluteUrl(item.Attachments[0]) : undefined) ||
    'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Service.aspx';

  return {
    externalId: tenderId || title,
    source: 'muni_tel_aviv',
    sourceUrl,
    title,
    description: tenderId ? `מכרז מס׳ ${tenderId}` : '',
    publisher: 'עיריית תל אביב-יפו',
    tenderType: 'municipal',
    status: 'open',
    publicationDate,
    submissionDeadline,
    rawData: {
      tenderId,
      attachments: item.Attachments,
      publicationDateDerived: true,
      listUrl: 'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Service.aspx',
    },
  };
}

export function telAvivAdapter(): TenderAdapter {
  return {
    source: 'muni_tel_aviv',
    async fetch() {
      const [active, archive] = await Promise.all([
        fetchTables(VIEW_ACTIVE, 100),
        fetchTables(VIEW_ARCHIVE, 500),
      ]);

      const byId = new Map<string, NormalizedTender>();
      for (const item of [...active, ...archive]) {
        const tender = itemToTender(item);
        if (!tender) continue;
        byId.set(tender.externalId, tender);
      }

      return { tenders: [...byId.values()] };
    },
  };
}
