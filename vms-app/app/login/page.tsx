'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hashPasswordAsync, setStoredSession } from '@/lib/auth';
import { Shield, KeyRound, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Fetch user record from Supabase app_users table
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (error || !user) {
        throw new Error('Invalid username or password.');
      }

      // 2. Hash provided password with stored salt and compare
      const computedHash = await hashPasswordAsync(password, user.salt);
      if (computedHash !== user.password_hash) {
        throw new Error('Invalid username or password.');
      }

      // 3. Set Session
      const sessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
        requires_password_change: user.requires_password_change,
      };
      setStoredSession(sessionData);

      // 4. Redirect based on password change flag
      if (user.requires_password_change) {
        router.push('/change-password');
      } else {
        router.push(user.role === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-brand-gold to-amber-500"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-gold text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg font-black">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin & Staff Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            HydraSpecma Visitor Management System
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs font-semibold mb-6 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter username (default: admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="Enter password (default: admin)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 bg-brand-gold text-slate-950 font-black text-sm rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center disabled:opacity-50 mt-2"
          >
            {isLoggingIn ? (
              'Authenticating...'
            ) : (
              <>
                Sign In to System <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
          Default Admin Password: <code className="text-brand-gold bg-slate-950 px-1.5 py-0.5 rounded">admin</code> (Mandatory password change on first login)
        </div>
      </div>
    </div>
  );
}
