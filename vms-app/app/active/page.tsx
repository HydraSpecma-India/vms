'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, LogOut, RefreshCw, Clock, Building, User, Phone, CheckCircle2 } from 'lucide-react';
import PassBadgeModal from '@/components/PassBadgeModal';

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
  photo_url?: string;
}

export default function ActiveVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [selectedVisitorForPass, setSelectedVisitorForPass] = useState<Visitor | null>(null);

  const fetchActiveVisitors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('status', 'active')
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setVisitors(data || []);
    } catch (err) {
      console.error('Error fetching active visitors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveVisitors();

    const channel = supabase
      .channel('realtime_visitors_active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        () => {
          fetchActiveVisitors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async (passId: string) => {
    setSigningOutId(passId);
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          status: 'signed-out',
          check_out_time: new Date().toISOString(),
        })
        .eq('pass_id', passId);

      if (error) throw error;
      fetchActiveVisitors();
    } catch (err) {
      console.error('Failed to sign out visitor:', err);
      alert('Sign out failed. Please try again.');
    } finally {
      setSigningOutId(null);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Active Visitors On-Site</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time tracking of visitors currently checked in.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-brand-gold font-bold block uppercase tracking-wider">On-Site Count</span>
            <span className="text-2xl font-black text-white">{visitors.length}</span>
          </div>

          <button
            onClick={fetchActiveVisitors}
            disabled={isLoading}
            className="p-3 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search active visitors by name, mobile, Pass ID, company, host..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white shadow-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
        />
      </div>

      {/* Visitors List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading active visitors...</div>
      ) : filteredVisitors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Active Visitors</h3>
          <p className="text-slate-400 text-xs mt-1">
            {searchQuery ? 'No visitors match your search criteria.' : 'All visitors have signed out.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisitors.map((visitor) => (
            <div
              key={visitor.id}
              className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl hover:border-slate-700 transition overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {visitor.photo_url ? (
                      <img
                        src={visitor.photo_url}
                        alt={visitor.full_name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-950 text-brand-gold flex items-center justify-center font-black text-lg border border-slate-800">
                        {visitor.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-white leading-tight">{visitor.full_name}</h3>
                      <span className="inline-block text-[11px] font-mono font-bold text-brand-gold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 mt-1">
                        {visitor.pass_id}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>{visitor.mobile}</span>
                  </div>
                  {visitor.company && (
                    <div className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-2 text-slate-500" />
                      <span>{visitor.company}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <User className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>Meeting: <strong className="text-slate-200">{visitor.who_to_meet || 'N/A'}</strong> ({visitor.host_department})</span>
                  </div>
                  <div className="flex items-center text-slate-500 pt-2 border-t border-slate-800/80">
                    <Clock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>Checked In: {new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex space-x-2">
                <button
                  onClick={() => setSelectedVisitorForPass(visitor)}
                  className="flex-1 px-3 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                >
                  View Badge
                </button>
                <button
                  onClick={() => handleSignOut(visitor.pass_id)}
                  disabled={signingOutId === visitor.pass_id}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  {signingOutId === visitor.pass_id ? 'Signing Out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVisitorForPass && (
        <PassBadgeModal
          visitor={selectedVisitorForPass}
          onClose={() => setSelectedVisitorForPass(null)}
        />
      )}
    </div>
  );
}
