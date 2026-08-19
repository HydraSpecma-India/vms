'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCheck, Users, FileText, UserCog, Shield } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Check-In Kiosk', href: '/', icon: UserCheck },
    { label: 'Active Visitors', href: '/active', icon: Users },
    { label: 'History & Reports', href: '/reports', icon: FileText },
    { label: 'Employee Directory', href: '/employees', icon: UserCog },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block">Visitor Management System</span>
              <span className="text-xs text-slate-400 block">HydraSpecma • Vercel & Supabase Edition</span>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
