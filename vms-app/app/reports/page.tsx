'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession } from '@/lib/auth';
import { FileText, Download, Search, Calendar, Filter, User, Image as ImageIcon, X } from 'lucide-react';

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
  number_of_visitors: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  photo_url?: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal for Viewing Photo
  const [selectedPhotoVisitor, setSelectedPhotoVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push('/');
      return;
    }
    fetchVisitors();
  }, [router]);

  const fetchVisitors = async () => {
    setIsLoading(true);
    let query = supabase.from('visitors').select('*').order('check_in_time', { ascending: false });

    if (startDate) {
      query = query.gte('check_in_time', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('check_in_time', `${endDate}T23:59:59.999Z`);
    }
    if (statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setVisitors(data);
    }
    setIsLoading(false);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (searchQuery) params.append('q', searchQuery);

    window.open(`/api/visitors/export?${params.toString()}`, '_blank');
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
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <FileText className="w-6 h-6 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Visitor History & Reports</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Browse full visitor logs, view captured photos, filter by date range, and export CSV reports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-5 py-3 bg-brand-gold text-slate-950 font-black text-xs rounded-2xl hover:bg-amber-400 transition shadow-xl"
        >
          <Download className="w-4 h-4 mr-2" /> Download CSV Export
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="relative">
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Search Record
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Name, Mobile, Pass ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active (On-Site)</option>
              <option value="signed-out">Signed Out</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={fetchVisitors}
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-700 transition"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" /> Apply Filters
          </button>
        </div>
      </div>

      {/* Visitor History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Pass ID</th>
                <th className="px-4 py-3">Visitor Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Host & Dept</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 font-semibold">
                    Loading history records...
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 font-semibold">
                    No visitor records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      {v.photo_url ? (
                        <button
                          onClick={() => setSelectedPhotoVisitor(v)}
                          className="group flex items-center space-x-1.5 p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
                          title="Click to view photo"
                        >
                          <img
                            src={v.photo_url}
                            alt={v.full_name}
                            className="w-9 h-9 object-cover rounded-lg border border-slate-700 group-hover:scale-105 transition"
                          />
                          <span className="text-[10px] text-brand-gold font-bold pr-1 hidden sm:inline">View</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-medium">No Photo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-gold whitespace-nowrap">
                      {v.pass_id}
                    </td>
                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{v.full_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{v.mobile}</td>
                    <td className="px-4 py-3">{v.company || '-'}</td>
                    <td className="px-4 py-3">{v.purpose || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-200 block">{v.who_to_meet || '-'}</span>
                      {v.host_department && (
                        <span className="text-slate-400 text-[10px] block">{v.host_department}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(v.check_in_time).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {v.check_out_time
                        ? new Date(v.check_out_time).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </td>
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

      {/* View Visitor Photo Modal */}
      {selectedPhotoVisitor && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-white text-center space-y-4 animate-in fade-in zoom-in duration-200 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-brand-gold" />
                <h3 className="font-bold text-sm text-white">Visitor Photo</h3>
              </div>
              <button
                onClick={() => setSelectedPhotoVisitor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center my-2">
              <img
                src={selectedPhotoVisitor.photo_url}
                alt={selectedPhotoVisitor.full_name}
                className="w-56 h-56 object-cover rounded-2xl border-2 border-brand-gold/60 shadow-2xl"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Pass ID:</span>
                <span className="font-mono font-bold text-brand-gold">{selectedPhotoVisitor.pass_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Full Name:</span>
                <span className="font-bold text-white">{selectedPhotoVisitor.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Company:</span>
                <span className="text-slate-300">{selectedPhotoVisitor.company || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Check-In:</span>
                <span className="text-slate-300">
                  {new Date(selectedPhotoVisitor.check_in_time).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPhotoVisitor(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
