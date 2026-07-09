import { createSupabaseServerClient } from '@/lib/supabase/ssr';
import { CATEGORY_TO_TENDER_TYPE, mergeCategoryOptions } from '@/lib/categories';
import { buildYearOptions, minPublicationDate, publicationYearRange, submittableDeadlineFilter } from '@/lib/tenders';

export const dynamic = 'force-dynamic';

type TenderRow = {
  id: string;
  source: string;
  source_url: string;
  title: string;
  description: string | null;
  publisher: string | null;
  tender_type: string | null;
  category: string[] | null;
  status: string | null;
  publication_date: string | null;
  submission_deadline: string | null;
};

function toInt(value: string | string[] | undefined, fallback: number) {
  const v = Array.isArray(value) ? value[0] : value;
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseYear(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  const n = v ? Number.parseInt(v, 10) : NaN;
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return null;
  return n;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qRaw = sp.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.trim() ?? '';
  const sourceRaw = sp.source;
  const source = (Array.isArray(sourceRaw) ? sourceRaw[0] : sourceRaw)?.trim() ?? '';
  const categoryRaw = sp.category;
  const category = (Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw)?.trim() ?? '';
  const year = parseYear(sp.year);
  const yearOptions = buildYearOptions();
  const page = toInt(sp.page, 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">דשבורד</h1>
        <p className="mt-2 text-sm text-zinc-600">
          חסרים משתני סביבה של Supabase. הגדר `NEXT_PUBLIC_SUPABASE_URL` ו־`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </p>
      </div>
    );
  }

  let query = supabase
    .from('tenders')
    .select(
      'id,source,source_url,title,description,publisher,tender_type,category,status,publication_date,submission_deadline',
      { count: 'exact' },
    );

  const { data: dbCategories } = await supabase.rpc('get_tender_categories');
  const categoryOptions = mergeCategoryOptions(dbCategories as string[] | null);

  if (source) {
    query = query.eq('source', source);
  }

  if (category) {
    const tenderType = CATEGORY_TO_TENDER_TYPE[category];
    if (tenderType) {
      const quoted = `"${category.replaceAll('"', '""')}"`;
      query = query.or(`category.cs.{${quoted}},tender_type.eq.${tenderType}`);
    } else {
      query = query.contains('category', [category]);
    }
  }

  if (year) {
    const range = publicationYearRange(year);
    query = query.gte('publication_date', range.from).lt('publication_date', range.to);
  } else {
    query = query.gte('publication_date', minPublicationDate());
  }

  if (q) {
    // MVP: case-insensitive substring on title/description.
    const escaped = q.replaceAll('%', '\\%').replaceAll('_', '\\_');
    query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  query = query.or(submittableDeadlineFilter());

  const { data, error, count } = await query
    // Default: show newest first. Deadline-based sorting can hide many sources when deadlines are missing.
    .order('publication_date', { ascending: false, nullsFirst: false })
    .order('submission_deadline', { ascending: true, nullsFirst: false })
    .range(from, to);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">דשבורד</h1>
        <p className="mt-2 text-sm text-red-600">
          שגיאה בקריאת נתונים מ־Supabase: {error.message}
        </p>
      </div>
    );
  }

  const rows = (data ?? []) as TenderRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (source) qs.set('source', source);
  if (category) qs.set('category', category);
  if (year) qs.set('year', String(year));
  const pageHref = (p: number) => {
    const next = new URLSearchParams(qs);
    if (p > 1) next.set('page', String(p));
    return `/dashboard?${next.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6 text-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold">מכרזים</h1>

        <div className="flex flex-wrap items-center gap-2">
          <form className="flex flex-wrap items-center gap-2" method="get" action="/dashboard">
            <select
              name="year"
              defaultValue={year ? String(year) : ''}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">כל השנים</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={category}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">כל הקטגוריות</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              name="source"
              defaultValue={source}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">כל המקורות</option>
              <option value="budgetkey">BudgetKey (ממשלתי)</option>
              <option value="budgetkey_muni">BudgetKey (עיריות)</option>
              <option value="budgetkey_mof">BudgetKey (משרד האוצר)</option>
              <option value="budgetkey_mr_gov">BudgetKey (mr.gov.il)</option>
              <option value="mr_gov">mr.gov.il</option>
              <option value="dekel">Dekel</option>
              <option value="mod">משרד הביטחון</option>
              <option value="rmi">רמ״י</option>
              <option value="soe_iaa">רשות שדות התעופה</option>
              <option value="soe_mekorot">מקורות (שח״מ)</option>
              <option value="soe_iec">חברת החשמל</option>
              <option value="soe_rail">רכבת ישראל</option>
              <option value="health_maccabi">מכבי</option>
              <option value="health_clalit">כללית</option>
              <option value="health_leumit">לאומית</option>
              <option value="health_meuhedet">מאוחדת</option>
              <option value="muni_tel_aviv">ת״א</option>
            </select>
            <input
              name="q"
              defaultValue={q}
              placeholder="חיפוש חופשי…"
              className="h-10 w-72 max-w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
            />
            <button className="h-10 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800">
              חפש
            </button>
            {q || source || category || year ? (
              <a
                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm leading-10 hover:bg-zinc-50"
                href="/dashboard"
              >
                נקה
              </a>
            ) : null}
          </form>

          <form
            action={async () => {
              'use server';
              await fetch('/api/auth/logout', { method: 'POST' });
            }}
          >
            <button className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50">
              יציאה
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-700">
        <div>
          נמצאו <span className="font-medium text-zinc-900">{total.toLocaleString('he-IL')}</span>{' '}
          תוצאות
        </div>
        <div className="flex items-center gap-2">
          <a
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50 aria-disabled:opacity-50"
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
          >
            הקודם
          </a>
          <div className="text-zinc-700">
            עמוד <span className="font-medium text-zinc-900">{page}</span> / {totalPages}
          </div>
          <a
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50 aria-disabled:opacity-50"
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
          >
            הבא
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-zinc-800">
            <tr>
              <th className="px-3 py-2 text-right font-medium">כותרת</th>
              <th className="px-3 py-2 text-right font-medium">תיאור</th>
              <th className="px-3 py-2 text-right font-medium">קטגוריה</th>
              <th className="px-3 py-2 text-right font-medium">מפרסם</th>
              <th className="px-3 py-2 text-right font-medium">מקור</th>
              <th className="px-3 py-2 text-right font-medium">פורסם</th>
              <th className="px-3 py-2 text-right font-medium">דדליין</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-zinc-200 text-zinc-900 hover:bg-zinc-50"
              >
                <td className="px-3 py-2 align-top">
                  <a className="font-medium text-zinc-950 hover:underline" href={`/dashboard/${r.id}`}>
                    {r.title}
                  </a>
                </td>
                <td className="max-w-xs px-3 py-2 align-top text-zinc-700">
                  {r.description && r.description !== r.title ? (
                    <span className="line-clamp-2">{r.description}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 align-top text-zinc-800">
                  {r.category?.length ? r.category.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 align-top text-zinc-800">{r.publisher ?? '—'}</td>
                <td className="px-3 py-2 align-top text-zinc-800">{r.source}</td>
                <td className="px-3 py-2 align-top text-zinc-800">
                  {r.publication_date ? new Date(r.publication_date).toLocaleDateString('he-IL') : '—'}
                </td>
                <td className="px-3 py-2 align-top text-zinc-800">
                  {r.submission_deadline
                    ? new Date(r.submission_deadline).toLocaleString('he-IL')
                    : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-500" colSpan={7}>
                  אין עדיין מכרזים. הרץ את ה־scraper ואז רענן.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

