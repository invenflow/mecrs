import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseServerAdmin } from '@/lib/supabase/server';

function containsAny(text: string, keywords: string[]) {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k.toLowerCase()));
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.SCRAPER_CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: 'missing_email_config' }, { status: 500 });
  }

  const supabase = createSupabaseServerAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_supabase_server_config' }, { status: 500 });
  }

  const { data: rules, error: rulesErr } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('enabled', true);

  if (rulesErr) {
    return NextResponse.json({ error: rulesErr.message }, { status: 500 });
  }

  const resend = new Resend(resendKey);

  let sent = 0;

  for (const rule of rules ?? []) {
    const keywords: string[] = Array.isArray(rule.keywords) ? rule.keywords : [];

    // For MVP: look at last 24h of tenders and match keywords against title+description.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: tenders, error: tendersErr } = await supabase
      .from('tenders')
      .select('id,title,description,publisher,source,submission_deadline')
      .gte('first_seen_at', since)
      .order('submission_deadline', { ascending: true, nullsFirst: false })
      .limit(200);

    if (tendersErr) continue;

    const matches = (tenders ?? []).filter((t) => {
      if (!keywords.length) return true;
      return containsAny(`${t.title ?? ''}\n${t.description ?? ''}`, keywords);
    });

    for (const t of matches) {
      const { data: already } = await supabase
        .from('alert_log')
        .select('id')
        .eq('alert_rule_id', rule.id)
        .eq('tender_id', t.id)
        .eq('channel', 'email')
        .maybeSingle();

      if (already) continue;

      const subject = `מכרז חדש: ${t.title}`;
      const body = `
<div dir="rtl" style="font-family: Arial, sans-serif">
  <h2 style="margin:0 0 8px 0;">${t.title}</h2>
  <div style="color:#555;font-size:14px;margin-bottom:12px;">
    <div><b>מפרסם:</b> ${t.publisher ?? '—'}</div>
    <div><b>מקור:</b> ${t.source ?? '—'}</div>
    <div><b>דדליין:</b> ${
      t.submission_deadline ? new Date(t.submission_deadline).toLocaleString('he-IL') : '—'
    }</div>
  </div>
  <p style="white-space:pre-wrap;color:#111;">${(t.description ?? '').slice(0, 1200)}</p>
</div>`;

      await resend.emails.send({
        from: fromEmail,
        to: rule.email,
        subject,
        html: body,
      });

      await supabase.from('alert_log').insert({
        alert_rule_id: rule.id,
        tender_id: t.id,
        channel: 'email',
      });

      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}

