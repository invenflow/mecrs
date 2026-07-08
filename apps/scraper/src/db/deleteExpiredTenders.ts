import type { SupabaseClient } from '@supabase/supabase-js';

const BATCH_SIZE = 500;

export async function deleteExpiredTenders(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  let deleted = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('tenders')
      .select('id')
      .lt('submission_deadline', now)
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!data?.length) break;

    const ids = data.map((row) => row.id);
    const { error: deleteError } = await supabase.from('tenders').delete().in('id', ids);
    if (deleteError) throw deleteError;

    deleted += ids.length;
    if (ids.length < BATCH_SIZE) break;
  }

  return { deleted };
}
