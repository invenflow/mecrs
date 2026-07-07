import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return children;
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect('/login');
  }

  return children;
}
