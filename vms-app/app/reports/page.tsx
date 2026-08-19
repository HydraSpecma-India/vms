'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Download, Calendar, Search } from 'lucide-react';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Visitor History & Reports</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Filter, search, and export complete visitor logs.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-5 py-3 bg-emerald-600 text-white font-black text-xs rounded-2xl hover:bg-emerald-500 shadow-xl transition"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV Report
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-300 mb-1">From Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1">To Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1">Search Keywords</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Name, pass ID, mobile, host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Visitor Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 uppercase font-bold text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">Loading history...</td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">No visitor records found.</td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-brand-gold whitespace-nowrap">{v.pass_id}</td>
                    <td className="px-4 py-3 font-bold text-white">{v.full_name}</td>
                    <td className="px-4 py-3">{v.mobile}</td>
                    <td className="px-4 py-3">{v.company || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-200">{v.who_to_meet || '-'}</span>
                      {v.host_department && <span className="block text-slate-400 text-[11px]">{v.host_department}</span>}
                    </td>
                    <td className="px-4 py-3">{v.purpose || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(v.check_in_time).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
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
