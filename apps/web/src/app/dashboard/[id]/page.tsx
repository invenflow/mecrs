import { createSupabaseServerClient } from '@/lib/supabase/ssr';
import { submittableDeadlineFilter } from '@/lib/tenders';

export const dynamic = 'force-dynamic';

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-600">
          חסרים משתני סביבה של Supabase. הגדר `NEXT_PUBLIC_SUPABASE_URL` ו־`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', id)
    .or(submittableDeadlineFilter())
    .maybeSingle();

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-600">מכרז לא נמצא.</p>
      </div>
    );
  }

  const docs = Array.isArray((data as any).documents) ? ((data as any).documents as any[]) : [];

  return (
    <div className="mx-auto w-full max-w-4xl p-6 text-zinc-950">
      <a className="text-sm text-zinc-600 hover:underline" href="/dashboard">
        חזרה
      </a>
      <h1 className="mt-3 text-2xl font-semibold">{(data as any).title}</h1>
      <p className="mt-2 text-sm text-zinc-700">{(data as any).publisher ?? '—'}</p>

      <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-zinc-500">מקור</div>
          <div>{(data as any).source}</div>
          <div className="text-zinc-500">סטטוס</div>
          <div>{(data as any).status ?? '—'}</div>
          <div className="text-zinc-500">תאריך פרסום</div>
          <div>
            {(data as any).publication_date
              ? new Date((data as any).publication_date).toLocaleString('he-IL')
              : '—'}
          </div>
          <div className="text-zinc-500">דדליין</div>
          <div>
            {(data as any).submission_deadline
              ? new Date((data as any).submission_deadline).toLocaleString('he-IL')
              : '—'}
          </div>
        </div>

        {(data as any).description ? (
          <div className="mt-2 whitespace-pre-wrap text-zinc-900">
            {(data as any).description}
          </div>
        ) : null}

        {(data as any).source_url ? (
          <a
            className="mt-2 inline-flex w-fit rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
            href={(data as any).source_url}
            target="_blank"
            rel="noreferrer"
          >
            מעבר למקור
          </a>
        ) : null}

        {docs.length > 0 ? (
          <div className="mt-4">
            <div className="text-sm font-medium">מסמכים</div>
            <ul className="mt-2 list-disc pr-5">
              {docs.map((d, idx) => (
                <li key={idx}>
                  <a className="hover:underline" href={d.url} target="_blank" rel="noreferrer">
                    {d.name ?? d.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

