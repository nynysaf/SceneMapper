'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface NotificationPref {
  mapId: string;
  mapTitle: string;
  mapSlug: string;
  enabled: boolean;
}

function AccountScreen({ user }: { user: User }) {
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  const [changeEmailSubmitting, setChangeEmailSubmitting] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [soleAdminCount, setSoleAdminCount] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPref[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    try {
      const r = await fetch('/api/account/notification-prefs', { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        setNotificationPrefs(data);
      }
    } catch {
      setNotificationPrefs([]);
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleTogglePref = async (mapId: string, enabled: boolean) => {
    setNotificationPrefs((prev) => prev.map((p) => (p.mapId === mapId ? { ...p, enabled } : p)));
    try {
      await fetch('/api/account/notification-prefs', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, enabled }),
      });
    } catch {
      setNotificationPrefs((prev) => prev.map((p) => (p.mapId === mapId ? { ...p, enabled: !enabled } : p)));
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError(null);
    if (!newEmail.trim()) return;
    setChangeEmailSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        setChangeEmailError(error.message);
        return;
      }
      setChangeEmailOpen(false);
      setNewEmail('');
      setEmailPassword('');
      window.location.reload();
    } catch {
      setChangeEmailError('Something went wrong.');
    } finally {
      setChangeEmailSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('Password must be at least 6 characters.');
      return;
    }
    setChangePasswordSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email ?? '',
        password: currentPassword,
      });
      if (signInError) {
        setChangePasswordError('Current password is incorrect.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setChangePasswordError(error.message);
        return;
      }
      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setChangePasswordError('Something went wrong.');
    } finally {
      setChangePasswordSubmitting(false);
    }
  };

  const openDeleteConfirm = async () => {
    setDeleteError(null);
    setDeleteConfirmOpen(true);
    try {
      const r = await fetch('/api/account/delete-preview', { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        setSoleAdminCount((data as { soleAdminMapCount?: number }).soleAdminMapCount ?? 0);
      }
    } catch {
      setSoleAdminCount(0);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const r = await fetch('/api/account/delete', { method: 'POST', credentials: 'include' });
      const data = await r.json();
      if (!r.ok) {
        setDeleteError((data as { error?: string }).error || 'Could not delete account.');
        return;
      }
      window.location.href = '/';
    } catch {
      setDeleteError('Something went wrong.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center p-6">
      <div className="max-w-lg w-full">
        <a href="/dashboard" className="text-sm text-emerald-700 hover:text-emerald-900 underline mb-6 inline-block">
          ← Back to Dashboard
        </a>
        <div className="glass rounded-3xl p-8 solarpunk-shadow space-y-8">
          <h1 className="text-xl font-bold text-emerald-950">Account</h1>

          <section>
            <h2 className="text-sm font-semibold text-emerald-900 mb-2">Email address</h2>
            <p className="text-sm text-emerald-800">{user.email}</p>
            {!changeEmailOpen ? (
              <button
                type="button"
                onClick={() => setChangeEmailOpen(true)}
                className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                Change email
              </button>
            ) : (
              <form onSubmit={handleChangeEmail} className="mt-3 space-y-2">
                <input
                  type="email"
                  required
                  placeholder="New email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  required
                  placeholder="Current password (to verify)"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                />
                {changeEmailError && <p className="text-xs text-rose-600">{changeEmailError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setChangeEmailOpen(false)} className="text-xs text-emerald-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={changeEmailSubmitting} className="text-xs font-semibold text-emerald-700">
                    {changeEmailSubmitting ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-emerald-900 mb-2">Password</h2>
            {!changePasswordOpen ? (
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                Change password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-3 space-y-2">
                <input
                  type="password"
                  required
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                />
                {changePasswordError && <p className="text-xs text-rose-600">{changePasswordError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setChangePasswordOpen(false)} className="text-xs text-emerald-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={changePasswordSubmitting} className="text-xs font-semibold text-emerald-700">
                    {changePasswordSubmitting ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-emerald-900 mb-1">Email notifications</h2>
            <p className="text-xs text-emerald-700 mb-3">
              You&apos;ll receive an email at the end of each day when public users submit new entries (nodes or connections) for review.
            </p>
            {prefsLoading ? (
              <p className="text-xs text-emerald-600">Loading…</p>
            ) : notificationPrefs.length === 0 ? (
              <p className="text-xs text-emerald-600">You don&apos;t admin any maps yet.</p>
            ) : (
              <div className="space-y-2">
                {notificationPrefs.map((p) => (
                  <label key={p.mapId} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => handleTogglePref(p.mapId, e.target.checked)}
                      className="rounded border-emerald-300 text-emerald-600"
                    />
                    <span>{p.mapTitle || p.mapSlug}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="pt-4 border-t border-emerald-100">
            <h2 className="text-sm font-semibold text-rose-800 mb-2">Delete account</h2>
            <p className="text-xs text-emerald-700 mb-3">
              This will permanently delete your account. You cannot undo this.
            </p>
            <button
              type="button"
              onClick={openDeleteConfirm}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              Delete my account
            </button>
          </section>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm"
          onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-md w-full solarpunk-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-emerald-950 mb-2">Delete account?</h3>
            {soleAdminCount !== null && soleAdminCount > 0 ? (
              <p className="text-sm text-emerald-800 mb-4">
                You are the only admin of <strong>{soleAdminCount}</strong> map(s). Deleting your account will permanently delete those maps. Add another admin to those maps if you want to keep them. Continue?
              </p>
            ) : (
              <p className="text-sm text-emerald-800 mb-4">This cannot be undone.</p>
            )}
            {deleteError && <p className="text-xs text-rose-600 mb-4">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hasRecoveryInHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return params.get('type') === 'recovery';
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const recovery = hasRecoveryInHash();

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsRecovery(recovery);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
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
      window.history.replaceState(null, '', '/account');
      setTimeout(() => {
        window.location.href = '/dashboard';
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

  if (isRecovery && user) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6">
        <div className="glass rounded-3xl p-8 solarpunk-shadow max-w-md w-full">
          <h1 className="text-xl font-bold text-emerald-950 mb-2">Set new password</h1>
          <p className="text-sm text-emerald-800 mb-6">
            Enter a new password for <span className="font-medium">{user.email}</span>
          </p>
          {success ? (
            <p className="text-emerald-700">Password updated. Redirecting to dashboard…</p>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
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
            href="/dashboard"
            className="mt-6 block text-center text-xs text-emerald-700 hover:text-emerald-900 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <AccountScreen user={user} />
    );
  }

  window.location.href = '/dashboard';
  return (
    <div className="min-h-screen bg-[#fdfcf0] flex items-center justify-center p-6">
      <p className="text-sm text-emerald-800">Redirecting to dashboard…</p>
    </div>
  );
}
