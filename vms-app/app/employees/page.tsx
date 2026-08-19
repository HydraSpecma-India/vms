'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCog, Search, Upload, RefreshCw, UserCheck } from 'lucide-react';
import Papa from 'papaparse';

interface Employee {
  id: string;
  display_name: string;
  email?: string;
  department?: string;
  job_title?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Parsing CSV...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const records = results.data.map((row: any) => ({
          display_name: row['Display name'] || row['displayName'] || row['Name'] || '',
          email: row['User principal name'] || row['email'] || '',
          department: row['Department'] || row['department'] || '',
          job_title: row['Job title'] || row['jobTitle'] || row['Title'] || '',
        })).filter(r => r.display_name.trim());

        if (records.length === 0) {
          setImportStatus('No valid employee records found in CSV.');
          setIsImporting(false);
          return;
        }

        setImportStatus(`Importing ${records.length} employees into database...`);

        const { error } = await supabase.from('employees').insert(records);
        if (error) {
          console.error('CSV import error:', error);
          setImportStatus(`Import failed: ${error.message}`);
        } else {
          setImportStatus(`Successfully imported ${records.length} employees!`);
          fetchEmployees();
        }
        setIsImporting(false);
      },
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.display_name.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <UserCog className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manage host employees used for kiosk auto-complete.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm cursor-pointer transition">
            <Upload className="w-4 h-4 mr-2" /> Import Employees CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm font-medium">
          {importStatus}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search employees by name, department, title, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
        />
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 uppercase font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Display Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Job Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">Loading employee directory...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">No employees found.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{emp.display_name}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.email || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{emp.department || '-'}</td>
                    <td className="px-4 py-3">{emp.job_title || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
