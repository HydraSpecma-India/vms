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
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  Menu,
  X,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    setSession(getStoredSession());

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

  // Hide navbar on unauthenticated login routes
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
    <nav className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40 shadow-2xl transition-all duration-300">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Brand Logo with Glow Animation */}
        <Link href="/kiosk" className="flex items-center space-x-3 group shrink-0">
          <div className="bg-brand-gold text-slate-950 p-2.5 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5 font-black" />
          </div>
          <div>
            <span className="text-white font-black text-sm tracking-wider block group-hover:text-brand-gold transition-colors duration-300">
              HYDRASPECMA
            </span>
            <span className="text-brand-gold text-[10px] font-extrabold tracking-widest block uppercase opacity-90">
              India • VMS
            </span>
          </div>
        </Link>

        {/* Center: Online/Offline Status Indicator */}
        <div className="flex items-center space-x-3">
          {!isOnline ? (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-950/90 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold shadow-lg animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline Mode ({pendingCount} pending)</span>
            </div>
          ) : pendingCount > 0 ? (
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded-full text-xs font-bold hover:bg-emerald-900 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Queue...' : `Sync Queue (${pendingCount})`}</span>
            </button>
          ) : (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-950/80 border border-slate-800 text-slate-400 rounded-full text-[11px] font-medium shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Online • Auto-Sync Active</span>
            </div>
          )}

          {/* Desktop Navigation Links with Animated Glow Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-gold text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Profile / Logout & Mobile Menu Toggle */}
        <div className="flex items-center space-x-3">
          {session && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white capitalize tracking-tight">{session.username}</span>
              <span className="text-[10px] text-brand-gold font-black uppercase tracking-wider">{session.role}</span>
            </div>
          )}

          {session && (
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-800 text-slate-300 rounded-xl border border-slate-700/60 transition-all duration-300 shadow hover:scale-105 active:scale-95"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 border border-slate-700"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-2 animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive ? 'bg-brand-gold text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-900/90 border-t border-emerald-700/80 text-emerald-200 px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}
    </nav>
  );
}
