import { createSupabaseServerAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const supabase = createSupabaseServerAdmin();
  if (!supabase) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">התראות</h1>
        <p className="mt-2 text-sm text-zinc-600">
          חסר `SUPABASE_SERVICE_ROLE_KEY` (או `NEXT_PUBLIC_SUPABASE_URL`) עבור קריאת כללי התראה.
        </p>
        <a className="mt-4 inline-block text-sm text-zinc-600 hover:underline" href="/dashboard">
          חזרה
        </a>
      </div>
    );
  }

  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto w-full max-w-4xl p-6 text-zinc-950">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">התראות</h1>
        <a className="text-sm text-zinc-600 hover:underline" href="/dashboard">
          חזרה
        </a>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700">
          ב־MVP זה ניהול בסיסי. יצירה/עריכה מלאה נוסיף בהמשך (או ברגע שתרצה).
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-zinc-800">
            <tr>
              <th className="px-3 py-2 text-right font-medium">שם</th>
              <th className="px-3 py-2 text-right font-medium">מייל</th>
              <th className="px-3 py-2 text-right font-medium">מילות מפתח</th>
              <th className="px-3 py-2 text-right font-medium">פעיל</th>
            </tr>
          </thead>
          <tbody>
            {(rules ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-zinc-200 text-zinc-900 hover:bg-zinc-50">
                <td className="px-3 py-2 text-zinc-950">{r.name}</td>
                <td className="px-3 py-2 text-zinc-800">{r.email}</td>
                <td className="px-3 py-2">
                  {Array.isArray(r.keywords) && r.keywords.length ? r.keywords.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 text-zinc-800">{r.enabled ? 'כן' : 'לא'}</td>
              </tr>
            ))}
            {(rules ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-500" colSpan={4}>
                  אין עדיין כללי התראה. הוסף רשומה בטבלת `alert_rules` ב־Supabase.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

