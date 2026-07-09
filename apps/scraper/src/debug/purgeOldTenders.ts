import 'dotenv/config';
import { createSupabaseAdminClient } from '../lib/supabaseAdmin';
import { MIN_PUBLICATION_DATE } from '../lib/publicationDate';

async function main() {
  const supabase = createSupabaseAdminClient();
  const cutoff = MIN_PUBLICATION_DATE.toISOString();

  const { error: olderError } = await supabase
    .from('tenders')
    .delete()
    .lt('publication_date', cutoff);
  if (olderError) throw olderError;

  const { error: nullError } = await supabase.from('tenders').delete().is('publication_date', null);
  if (nullError) throw nullError;

  console.log(JSON.stringify({ action: 'purge_old_tenders', cutoff }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

