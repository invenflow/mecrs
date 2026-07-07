import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

