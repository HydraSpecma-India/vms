'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession, UserSession } from '@/lib/auth';
import { Search, UserCog, Upload, Users, Building, Mail, Briefcase, FileSpreadsheet } from 'lucide-react';

interface Employee {
  id: string;
  display_name: string;
  email?: string;
  department?: string;
  job_title?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    const s = getStoredSession();
    if (!s) {
      router.push('/');
      return;
    }
    setSession(s);
    setIsAuthenticated(true);
    fetchEmployees();
  }, [router]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('display_name');
    if (!error && data) {
      setEmployees(data);
    }
    setIsLoading(false);
  };

  const departments = ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    setImportStatus('Processing CSV...');

    try {
      const lines = csvText.split('\n');
      const newEmployees = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (i === 0 && line.toLowerCase().includes('display_name')) continue;

        const parts = line.split(',');
        if (parts.length >= 1) {
          const display_name = parts[0]?.trim();
          const email = parts[1]?.trim() || '';
          const department = parts[2]?.trim() || '';
          const job_title = parts[3]?.trim() || '';

          if (display_name) {
            newEmployees.push({ display_name, email, department, job_title });
          }
        }
      }

      if (newEmployees.length === 0) {
        setImportStatus('No valid employee rows found.');
        return;
      }

      const { error } = await supabase.from('employees').insert(newEmployees);
      if (error) throw error;

      setImportStatus(`Successfully imported ${newEmployees.length} employees!`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setCsvText('');
        setImportStatus(null);
        fetchEmployees();
      }, 1500);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs font-semibold">
        Authenticating session...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <UserCog className="w-6 h-6 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Employee Host Directory</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Search host employees to verify availability for visitor check-in.
          </p>
        </div>

        {/* CSV Import Button restricted to Admin only */}
        {session?.role === 'admin' && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 hover:bg-brand-gold hover:text-slate-950 text-xs font-bold rounded-xl transition shadow"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Employee CSV (Admin Only)
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by employee name, email, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-bold uppercase shrink-0">Department:</span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept || 'All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedDepartment === (dept || 'All')
                  ? 'bg-brand-gold text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {dept || 'General'}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-semibold">Loading directory...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs font-semibold">
          No employees match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm text-white">{emp.display_name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-400/10 text-brand-gold border border-amber-500/20">
                    {emp.department || 'General'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 pt-1">
                  {emp.job_title && (
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{emp.job_title}</span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import Modal (Admin Only) */}
      {isImportModalOpen && session?.role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Import Employees via CSV</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste comma-separated employee rows in format: <br />
              <code className="text-brand-gold bg-slate-950 px-1 py-0.5 rounded mt-1 block">
                display_name, email, department, job_title
              </code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="e.g. John Smith, john@hydraspecma.com, Engineering, Senior Manager"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-brand-gold focus:outline-none font-mono"
            />

            {importStatus && (
              <div className="text-xs font-bold text-brand-gold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                {importStatus}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="px-5 py-2 bg-brand-gold text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400"
              >
                Start CSV Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
