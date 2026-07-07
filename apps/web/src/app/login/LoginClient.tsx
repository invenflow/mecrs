'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get('next') ?? '/dashboard';

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-[100svh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">כניסה</h1>
        <p className="mt-1 text-sm text-zinc-600">
          התחבר עם חשבון ה־Admin (Supabase Auth).
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            setPending(false);
            if (error) {
              setError('פרטי התחברות שגויים או משתמש לא קיים.');
              return;
            }
            router.push(nextPath);
            router.refresh();
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">אימייל</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">סיסמה</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? 'מתחבר…' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}

