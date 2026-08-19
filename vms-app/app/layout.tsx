import './globals.css';
import Navbar from '@/components/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visitor Management System - HydraSpecma India',
  description: 'HydraSpecma India Private Limited Visitor Check-In System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        <Navbar />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6">
          {children}
        </main>
        <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs font-semibold text-slate-400 no-print">
          HydraSpecma India Private Limited
        </footer>
      </body>
    </html>
  );
}
