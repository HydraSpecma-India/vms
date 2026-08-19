import './globals.css';
import Navbar from '@/components/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visitor Management System',
  description: 'Visitor Check-In, Pass Generation & Reporting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          Visitor Management System • Powered by Next.js & Supabase
        </footer>
      </body>
    </html>
  );
}
