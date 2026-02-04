'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function hasRecoveryInHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return params.get('type') === 'recovery';
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const recovery = hasRecoveryInHash();

    if (!recovery) {
      setLoading(false);
      setInvalidLink(true);
      return;
    }

    let done = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let sub: { unsubscribe: () => void } | null = null;

    const finish = (user: { email?: string | null } | null) => {
      if (done) return;
      done = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (sub) sub.unsubscribe();
      if (user) {
        setEmail(user.email ?? null);
        setInvalidLink(false);
      } else {
        setInvalidLink(true);
      }
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        finish(session.user);
        return;
      }
      timeoutId = setTimeout(() => finish(null), 2500);
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (s?.user) finish(s.user);
      });
      sub = subscription;
    });

    return () => {
      done = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (sub) sub.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-emerald-800">Loading…</p>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6">
        <div className="glass rounded-3xl p-8 solarpunk-shadow max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-emerald-950 mb-2">Invalid or expired link</h1>
          <p className="text-sm text-emerald-800 mb-6">
            This password reset link is invalid or has expired. Request a new one from the login
            screen.
          </p>
          <a
            href="/dashboard"
            className="inline-block w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors text-center"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 solarpunk-shadow max-w-md w-full">
        <h1 className="text-xl font-bold text-emerald-950 mb-2">Set new password</h1>
        <p className="text-sm text-emerald-800 mb-6">
          Enter a new password for <span className="font-medium">{email ?? 'your account'}</span>
        </p>
        {success ? (
          <p className="text-emerald-700">Password updated. Redirecting to home…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-900">New password</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-900">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="Retype your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save password'}
            </button>
          </form>
        )}
        <a
          href="/"
          className="mt-6 block text-center text-xs text-emerald-700 hover:text-emerald-900 underline"
        >
          Back to Scene Mapper
        </a>
      </div>
    </div>
  );
}
