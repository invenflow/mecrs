import 'dotenv/config';
import { createSupabaseAdminClient } from './lib/supabaseAdmin';
import { budgetKeyAdapter } from './adapters/budgetkey';
import { budgetKeyMofAdapter, budgetKeyMrGovTableAdapter } from './adapters/budgetkeyExtra';
import { dataGovAdapter } from './adapters/dataGov';
import { rmiAdapter } from './adapters/rmi';
import { mrGovAdapter } from './adapters/mrGov';
import { modAdapter } from './adapters/mod';
import { dekelAdapter } from './adapters/dekel';
import { telAvivAdapter } from './adapters/municipalities/telAviv';
import { iaaAdapter } from './adapters/soe/iaa';
import { mekorotAdapter } from './adapters/soe/mekorot';
import { iecAdapter } from './adapters/soe/iec';
import { railAdapter } from './adapters/soe/rail';
import { maccabiAdapter } from './adapters/health/maccabi';
import { clalitAdapter } from './adapters/health/clalit';
import { leumitAdapter } from './adapters/health/leumit';
import { meuhedetAdapter } from './adapters/health/meuhedet';
import { deriveCategories } from './lib/categories';
import { withContentHash } from './normalizer';
import { upsertTenders } from './db/upsertTenders';
import { deleteExpiredTenders } from './db/deleteExpiredTenders';
import { filterByMinPublicationDate, MIN_PUBLICATION_DATE } from './lib/publicationDate';

async function main() {
  const supabase = createSupabaseAdminClient();

  const adapters = [
    budgetKeyAdapter(),
    budgetKeyMofAdapter(),
    budgetKeyMrGovTableAdapter(),
    // TODO: replace resourceId with the actual data.gov.il dataset you want to track
    dataGovAdapter(process.env.DATA_GOV_RESOURCE_ID ?? ''),
    rmiAdapter(),
    mrGovAdapter(),
    modAdapter(),
    dekelAdapter(),
    telAvivAdapter(),
    iaaAdapter(),
    mekorotAdapter(),
    iecAdapter(),
    railAdapter(),
    maccabiAdapter(),
    clalitAdapter(),
    leumitAdapter(),
    meuhedetAdapter(),
  ].filter((a) => (a.source !== 'data_gov' ? true : (process.env.DATA_GOV_RESOURCE_ID ?? '').length > 0));

  for (const adapter of adapters) {
    try {
      const { tenders } = await adapter.fetch();
      const normalized = tenders.map((t) =>
        withContentHash({ ...t, category: deriveCategories(t) }),
      );
      const pre = filterByMinPublicationDate(normalized);
      const res = await upsertTenders(supabase, pre.kept);
      console.log(
        JSON.stringify(
          {
            source: adapter.source,
            minPublicationDate: MIN_PUBLICATION_DATE.toISOString(),
            fetched: tenders.length,
            normalized: normalized.length,
            keptByMinPublicationDate: pre.kept.length,
            ...res,
            skippedOld: pre.skippedOld,
            skippedNoDate: pre.skippedNoDate,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      console.error(`[${adapter.source}] failed`, err);
    }
  }

  try {
    const cleanup = await deleteExpiredTenders(supabase);
    console.log(JSON.stringify({ action: 'delete_expired', ...cleanup }, null, 2));
  } catch (err) {
    console.error('[delete_expired] failed', err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

