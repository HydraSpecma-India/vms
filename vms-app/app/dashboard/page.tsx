'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession } from '@/lib/auth';
import { LayoutDashboard, Users, UserCheck, LogOut, RefreshCw, Building2, TrendingUp, Clock } from 'lucide-react';

interface Visitor {
  id: string;
  pass_id: string;
  full_name: string;
  mobile: string;
  company?: string;
  purpose?: string;
  who_to_meet?: string;
  host_department?: string;
  number_of_visitors: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [visitorsToday, setVisitorsToday] = useState<Visitor[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [signedOutToday, setSignedOutToday] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardMetrics = async () => {
    setIsLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const fromTimestamp = `${todayISO}T00:00:00.000Z`;

      // 1. Fetch all check-ins today
      const { data: todayData, error: todayErr } = await supabase
        .from('visitors')
        .select('*')
        .gte('check_in_time', fromTimestamp)
        .order('check_in_time', { ascending: false });

      if (todayErr) throw todayErr;

      // 2. Fetch all currently active visitors (including prior days if still active)
      const { data: activeData, error: activeErr } = await supabase
        .from('visitors')
        .select('*')
        .eq('status', 'active')
        .order('check_in_time', { ascending: false });

      if (activeErr) throw activeErr;

      const todayList = todayData || [];
      const activeList = activeData || [];
      const signedOutList = todayList.filter((v) => v.status === 'signed-out');

      setVisitorsToday(todayList);
      setActiveVisitors(activeList);
      setSignedOutToday(signedOutList);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push('/');
      return;
    }

    fetchDashboardMetrics();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('realtime_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchDashboardMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Compute department breakdown
  const deptMap: { [key: string]: number } = {};
  visitorsToday.forEach((v) => {
    const dept = v.host_department?.trim() || 'General / Unspecified';
    deptMap[dept] = (deptMap[dept] || 0) + (v.number_of_visitors || 1);
  });

  const totalOnSiteGroupCount = activeVisitors.reduce(
    (sum, v) => sum + (v.number_of_visitors || 1),
    0
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <LayoutDashboard className="w-6 h-6 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Visitor Analytics Dashboard</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time daily counts & facility occupancy summary for HydraSpecma India.
          </p>
        </div>

        <button
          onClick={fetchDashboardMetrics}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Live Refresh
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Total Check-Ins */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Total Visited Today
            </span>
            <div className="p-3 bg-amber-400/10 text-brand-gold rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-white">{visitorsToday.length}</span>
            <span className="text-xs text-slate-400 block mt-1">Checked in today</span>
          </div>
        </div>

        {/* Card 2: Currently Still In / On-Site */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
              Still In (On-Site)
            </span>
            <div className="p-3 bg-emerald-950 text-emerald-400 rounded-2xl border border-emerald-800">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-emerald-400">{activeVisitors.length}</span>
            <span className="text-xs text-slate-400 block mt-1">
              Active passes ({totalOnSiteGroupCount} total persons)
            </span>
          </div>
        </div>

        {/* Card 3: Signed Out Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Signed Out Today
            </span>
            <div className="p-3 bg-slate-800 text-slate-300 rounded-2xl">
              <LogOut className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-white">{signedOutToday.length}</span>
            <span className="text-xs text-slate-400 block mt-1">Completed visits today</span>
          </div>
        </div>

        {/* Card 4: Occupancy Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Active Ratio
            </span>
            <div className="p-3 bg-brand-gold text-slate-950 rounded-2xl font-black">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-brand-gold">
              {visitorsToday.length > 0
                ? `${Math.round((activeVisitors.length / visitorsToday.length) * 100)}%`
                : '0%'}
            </span>
            <span className="text-xs text-slate-400 block mt-1">Visitors currently inside</span>
          </div>
        </div>
      </div>

      {/* Secondary Grid: Recent Active & Department Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Visitors Summary List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Clock className="w-4 h-4 text-brand-gold mr-2" /> Currently Active On-Site ({activeVisitors.length})
            </h3>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {activeVisitors.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs">No active visitors on-site.</p>
            ) : (
              activeVisitors.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-brand-gold text-xs px-2 py-1 bg-slate-900 rounded border border-slate-800">
                      {v.pass_id}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-white">{v.full_name}</h4>
                      <span className="text-[11px] text-slate-400 block">
                        Meeting: <strong className="text-slate-200">{v.who_to_meet}</strong> ({v.host_department})
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 mb-0.5">
                      Active
                    </span>
                    <span className="block text-[10px]">
                      {new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Department Breakdown Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Building2 className="w-4 h-4 text-brand-gold mr-2" /> Department Breakdown
            </h3>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.keys(deptMap).length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs">No visit data recorded today.</p>
            ) : (
              Object.entries(deptMap).map(([dept, count]) => (
                <div
                  key={dept}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs"
                >
                  <span className="font-semibold text-slate-300">{dept}</span>
                  <span className="font-black text-brand-gold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {count} visitor(s)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
