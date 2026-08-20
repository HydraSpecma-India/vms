'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession } from '@/lib/auth';
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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [selectedVisitorForPass, setSelectedVisitorForPass] = useState<Visitor | null>(null);

  useEffect(() => {
    const s = getStoredSession();
    if (!s) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
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
  }, [router]);

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

  const handleSignOut = async (visitorId: string, passId: string) => {
    if (!confirm(`Are you sure you want to sign out visitor pass '${passId}'?`)) return;

    setSigningOutId(visitorId);
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          status: 'signed-out',
          check_out_time: new Date().toISOString(),
        })
        .eq('id', visitorId);

      if (error) throw error;
      fetchActiveVisitors();
    } catch (err: any) {
      console.error('Sign out error:', err);
      alert(`Failed to sign out visitor: ${err.message}`);
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
      <div className="glass-panel p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-gold text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Active On-Site Visitors</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Real-time tracking of visitors currently checked in inside the facility.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-extrabold text-xs rounded-full flex items-center shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span>
            {visitors.length} On-Site Now
          </span>

          <button
            onClick={fetchActiveVisitors}
            className="p-2.5 bg-slate-800 hover:bg-brand-gold hover:text-slate-950 text-slate-300 rounded-xl border border-slate-700 transition-all duration-300 shadow hover:scale-105"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Filter active visitors by name, mobile, company, host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
          />
        </div>
      </div>

      {/* Active Visitor Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500 text-xs font-semibold">
          Loading active visitor records...
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center text-slate-500 text-xs font-semibold">
          No active visitors on-site matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVisitors.map((vis) => (
            <div
              key={vis.id}
              className="glass-panel glass-panel-hover p-5 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {vis.photo_url ? (
                      <img
                        src={vis.photo_url}
                        alt={vis.full_name}
                        className="w-12 h-12 object-cover rounded-2xl border-2 border-brand-gold shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-950 rounded-2xl border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0">
                        {vis.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-white">{vis.full_name}</h3>
                      <span className="text-[10px] font-mono text-brand-gold font-extrabold block">
                        {vis.pass_id}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Mobile:</span>
                    <span className="font-mono text-white">{vis.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Company:</span>
                    <span className="text-slate-200">{vis.company || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Meeting Host:</span>
                    <span className="font-bold text-white">{vis.who_to_meet || '-'}</span>
                  </div>
                  {vis.host_department && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Department:</span>
                      <span className="text-brand-gold font-bold text-[11px]">{vis.host_department}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Check-In Time:</span>
                    <span className="text-slate-300">
                      {new Date(vis.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex space-x-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedVisitorForPass(vis)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  Reprint Badge
                </button>
                <button
                  onClick={() => handleSignOut(vis.id, vis.pass_id)}
                  disabled={signingOutId === vis.id}
                  className="flex-1 py-2 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 font-bold text-xs rounded-xl transition shadow"
                >
                  {signingOutId === vis.id ? 'Signing Out...' : 'Sign Out'}
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
