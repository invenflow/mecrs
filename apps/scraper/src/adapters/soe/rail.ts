import type { TenderAdapter } from '../base';
import type { NormalizedTender } from '../../types/tender';
import { fetchHtml } from '../../lib/htmlDetail';

/**
 * Israel Railways tender portal is a client-side app; this adapter is best-effort and
 * may return 0 results if the portal doesn't expose server-rendered data.
 */
export function railAdapter(): TenderAdapter {
  return {
    source: 'soe_rail',
    async fetch() {
      const listUrl = 'https://tender.rail.co.il/?page=generalauctions';
      const html = await fetchHtml(listUrl);

      // Best-effort: try to find auctionId links in the raw HTML.
      const ids = Array.from(
        new Set(Array.from(html.matchAll(/auctionId=([0-9a-fA-F-]{8,})/g)).map((m) => m[1])),
      ).slice(0, 200);

      const tenders: NormalizedTender[] = ids.map((auctionId) => {
        const url = `https://tender.rail.co.il/?page=generalauctions&auctionId=${encodeURIComponent(auctionId)}`;
        return {
          externalId: auctionId,
          source: 'soe_rail',
          sourceUrl: url,
          title: `מכרז רכבת ישראל ${auctionId}`,
          publisher: 'רכבת ישראל',
          tenderType: 'soe',
          status: 'open',
          rawData: { listUrl },
        };
      });

      return { tenders };
    },
  };
}

