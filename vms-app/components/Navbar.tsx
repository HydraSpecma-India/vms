'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserCheck, Users, FileText, UserCog, Shield, LogIn, LogOut, LayoutDashboard } from 'lucide-react';
import { getStoredSession, setStoredSession, UserSession } from '@/lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, [pathname]);

  const handleLogout = () => {
    setStoredSession(null);
    setSession(null);
    router.push('/');
  };

  const navItems = [];

  if (session) {
    navItems.push({ label: 'Analytics Dashboard', href: '/dashboard', icon: LayoutDashboard });
    navItems.push({ label: 'Visitor Kiosk', href: '/kiosk', icon: UserCheck });
    navItems.push({ label: 'Active Visitors', href: '/active', icon: Users });
    navItems.push({ label: 'History & Reports', href: '/reports', icon: FileText });
    navItems.push({ label: 'Employee Directory', href: '/employees', icon: UserCog });
    if (session.role === 'admin') {
      navItems.push({ label: 'Admin Management', href: '/admin', icon: Shield });
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-xl no-print w-full">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Corporate Title */}
          <Link href={session ? '/dashboard' : '/'} className="flex items-center space-x-3 group">
            <div className="bg-brand-gold p-2 rounded-xl text-slate-950 shadow-md group-hover:scale-105 transition transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block text-white group-hover:text-brand-gold transition">
                HydraSpecma
              </span>
              <span className="text-[10px] font-semibold text-brand-gold uppercase tracking-widest block">
                Visitor Management System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-brand-gold text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Auth State & Logout / Login */}
          <div className="flex items-center space-x-3">
            {session ? (
              <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <div className="text-right">
                  <span className="font-bold block text-slate-100">{session.username}</span>
                  <span className="text-[10px] text-brand-gold font-bold uppercase block">{session.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl hover:bg-brand-gold hover:text-slate-950 transition shadow"
              >
                <LogIn className="w-4 h-4 mr-1.5 text-brand-gold" /> System Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
