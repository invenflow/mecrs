import 'dotenv/config';
import { createSupabaseAdminClient } from './lib/supabaseAdmin';
import { budgetKeyAdapter } from './adapters/budgetkey';
import { dataGovAdapter } from './adapters/dataGov';
import { rmiAdapter } from './adapters/rmi';
import { mrGovAdapter } from './adapters/mrGov';
import { modAdapter } from './adapters/mod';
import { dekelAdapter } from './adapters/dekel';
import { telAvivAdapter } from './adapters/municipalities/telAviv';
import { iaaAdapter } from './adapters/soe/iaa';
import { maccabiAdapter } from './adapters/health/maccabi';
import { withContentHash } from './normalizer';
import { upsertTenders } from './db/upsertTenders';

async function main() {
  const supabase = createSupabaseAdminClient();

  const adapters = [
    budgetKeyAdapter(),
    // TODO: replace resourceId with the actual data.gov.il dataset you want to track
    dataGovAdapter(process.env.DATA_GOV_RESOURCE_ID ?? ''),
    rmiAdapter(),
    mrGovAdapter(),
    modAdapter(),
    dekelAdapter(),
    telAvivAdapter(),
    iaaAdapter(),
    maccabiAdapter(),
  ].filter((a) => (a.source !== 'data_gov' ? true : (process.env.DATA_GOV_RESOURCE_ID ?? '').length > 0));

  for (const adapter of adapters) {
    try {
      const { tenders } = await adapter.fetch();
      const normalized = tenders.map(withContentHash);
      const res = await upsertTenders(supabase, normalized);
      console.log(JSON.stringify({ source: adapter.source, ...res }, null, 2));
    } catch (err) {
      console.error(`[${adapter.source}] failed`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

