'use client';

import React, { useEffect } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import { syncOfflineQueue } from '@/lib/offlineSync';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register PWA Service Worker for Offline functionality
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('ServiceWorker registered:', reg.scope))
        .catch((err) => console.warn('ServiceWorker registration failed:', err));

      // Attempt background sync if online on page load
      if (navigator.onLine) {
        syncOfflineQueue();
      }
    }
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <title>HydraSpecma India - Visitor Management System</title>
        <meta
          name="description"
          content="Full fit size visitor check-in, 80mm receipt printing, live analytics & offline sync"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-brand-gold selection:text-slate-950">
        <Navbar />
        <main className="flex-1 w-full max-w-full px-4 sm:px-6 lg:px-10 py-6">
          {children}
        </main>
        <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-400 font-semibold no-print">
          HydraSpecma India Private Limited
        </footer>
      </body>
    </html>
  );
}
