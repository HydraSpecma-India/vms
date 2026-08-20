'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession, setStoredSession, hashPasswordAsync } from '@/lib/auth';
import { KeyRound, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const s = getStoredSession();
    if (!s) {
      router.push('/');
    } else {
      setSession(s);
    }
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword || newPassword.length < 5) {
      setErrorMsg('Password must be at least 5 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsUpdating(true);

    try {
      const salt = 'vms_salt_2026';
      const newHash = await hashPasswordAsync(newPassword, salt);

      const { error } = await supabase
        .from('app_users')
        .update({
          password_hash: newHash,
          salt: salt,
          requires_password_change: false,
        })
        .eq('username', session.username);

      if (error) throw error;

      // Update stored session
      const updatedSession = {
        ...session,
        requires_password_change: false,
      };
      setStoredSession(updatedSession);

      alert('Password updated successfully!');
      router.push(session.role === 'admin' ? '/admin' : '/kiosk');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs font-semibold">
        Authenticating session...
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-brand-gold to-amber-500"></div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-400/20 text-brand-gold border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Update Password Required</h1>
          <p className="text-xs text-slate-400 mt-1">
            First-time login detected for account <strong className="text-white">{session.username}</strong>. Please set a new password.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs font-semibold mb-6 flex items-center shadow">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={5}
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={5}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full py-3.5 bg-brand-gold text-slate-950 font-black text-sm rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center disabled:opacity-50 mt-2"
          >
            {isUpdating ? (
              'Updating Password...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Save & Continue to System
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
