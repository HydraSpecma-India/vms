'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { setStoredSession, getStoredSession, UserSession } from '@/lib/auth';
import { getPendingOfflineVisitors, syncOfflineQueue } from '@/lib/offlineSync';
import {
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  LogOut,
  UserCog,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    setSession(getStoredSession());

    // Monitor Network Online/Offline Status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = async () => {
        setIsOnline(true);
        triggerAutoSync();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      checkPendingQueue();
      const interval = setInterval(checkPendingQueue, 5000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  const checkPendingQueue = async () => {
    const pending = await getPendingOfflineVisitors();
    setPendingCount(pending.length);
  };

  const triggerAutoSync = async () => {
    setIsSyncing(true);
    const res = await syncOfflineQueue();
    setIsSyncing(false);
    checkPendingQueue();

    if (res.syncedCount > 0) {
      setSyncToast(`Synced ${res.syncedCount} offline visitor record(s) to Supabase!`);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const handleLogout = () => {
    setStoredSession(null);
    router.push('/');
  };

  // Hide nav on login pages if unauthenticated
  if ((pathname === '/' || pathname === '/login') && !session) {
    return null;
  }

  const navLinks = [
    { href: '/kiosk', label: 'Visitor Check-In', icon: UserCheck },
    { href: '/active', label: 'Active Visitors', icon: Users },
    { href: '/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { href: '/reports', label: 'History & Reports', icon: FileSpreadsheet },
    { href: '/employees', label: 'Employee Directory', icon: UserCog },
  ];

  if (session?.role === 'admin') {
    navLinks.push({ href: '/admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <Link href="/kiosk" className="flex items-center space-x-3 group shrink-0">
          <div className="bg-brand-gold text-slate-950 p-2 rounded-xl group-hover:scale-105 transition shadow">
            <ShieldCheck className="w-5 h-5 font-black" />
          </div>
          <div>
            <span className="text-white font-black text-sm tracking-wide block">HYDRASPECMA</span>
            <span className="text-brand-gold text-[10px] font-bold tracking-widest block uppercase">
              India • VMS
            </span>
          </div>
        </Link>

        {/* Network Status & Sync Indicator */}
        <div className="flex items-center space-x-3">
          {!isOnline ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-full text-xs font-bold shadow animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode ({pendingCount} pending)</span>
            </div>
          ) : pendingCount > 0 ? (
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-full text-xs font-bold hover:bg-emerald-900 transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : `Sync Queue (${pendingCount})`}</span>
            </button>
          ) : (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-400 rounded-full text-[11px] font-medium">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Online • Auto-Sync Active</span>
            </div>
          )}

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-brand-gold text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Account Dropdown / Logout */}
        {session && (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white capitalize">{session.username}</span>
              <span className="text-[10px] text-brand-gold font-extrabold uppercase">{session.role}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 rounded-xl transition shadow"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-900 border-t border-emerald-700 text-emerald-200 px-4 py-2 text-center text-xs font-bold flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{syncToast}</span>
        </div>
      )}
    </nav>
  );
}
