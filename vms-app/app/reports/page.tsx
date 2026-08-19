'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Download, Calendar, Search, Filter } from 'lucide-react';

interface Visitor {
  id: string;
  pass_id: string;
  full_name: string;
  mobile: string;
  email?: string;
  company?: string;
  purpose?: string;
  who_to_meet?: string;
  host_department?: string;
  host_title?: string;
  number_of_visitors: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
}

export default function ReportsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchVisitorHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('visitors')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (fromDate) {
        query = query.gte('check_in_time', `${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        query = query.lte('check_in_time', `${toDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVisitors(data || []);
    } catch (err) {
      console.error('Error fetching visitor history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorHistory();
  }, [fromDate, toDate]);

  const handleExportCSV = () => {
    const url = `/api/visitors/export${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ''}`;
    window.open(url, '_blank');
  };

  const filteredVisitors = visitors.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.full_name.toLowerCase().includes(q) ||
      v.mobile.includes(q) ||
      v.pass_id.toLowerCase().includes(q) ||
      (v.company && v.company.toLowerCase().includes(q)) ||
      (v.who_to_meet && v.who_to_meet.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Visitor History & Reports</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Filter, search, and export complete visitor log records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-sm transition"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV Report
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search Keywords</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Name, pass ID, mobile, host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Visitor Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 uppercase font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Pass ID</th>
                <th className="px-4 py-3">Visitor Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Host & Dept</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">Loading history...</td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">No visitor records found.</td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">{v.pass_id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{v.full_name}</td>
                    <td className="px-4 py-3">{v.mobile}</td>
                    <td className="px-4 py-3">{v.company || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{v.who_to_meet || '-'}</span>
                      {v.host_department && <span className="block text-slate-500 text-[11px]">{v.host_department}</span>}
                    </td>
                    <td className="px-4 py-3">{v.purpose || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(v.check_in_time).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
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
