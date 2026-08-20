'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
  Building,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Shield,
  Activity,
} from 'lucide-react';

interface VisitorStats {
  totalToday: number;
  stillIn: number;
  signedOutToday: number;
  totalHistorical: number;
  departmentBreakdown: { department: string; count: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [stats, setStats] = useState<VisitorStats>({
    totalToday: 0,
    stillIn: 0,
    signedOutToday: 0,
    totalHistorical: 0,
    departmentBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const s = getStoredSession();
    if (!s) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
    fetchStats();

    // Realtime Supabase Subscription for Live Updates
    const channel = supabase
      .channel('public:visitors_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Calculate today's date boundaries in Indian Standard Time (IST)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStartIso = `${year}-${month}-${day}T00:00:00.000Z`;

      // 1. Total Historical Records (Exact Count)
      const { count: totalHistoricalCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true });

      // 2. Total Visitors Checked In Today (Exact Count)
      const { count: totalTodayCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_time', todayStartIso);

      // 3. Still On-Site (Active Status Across Database)
      const { count: stillInCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 4. Signed Out Today
      const { count: signedOutTodayCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_time', todayStartIso)
        .neq('status', 'active');

      // 5. Host Department Volume Breakdown for Today
      const { data: todayDepts } = await supabase
        .from('visitors')
        .select('host_department')
        .gte('check_in_time', todayStartIso);

      const deptCounts: { [key: string]: number } = {};
      if (todayDepts) {
        todayDepts.forEach((v) => {
          const dept = v.host_department?.trim() || 'General / Unspecified';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
      }

      const departmentBreakdown = Object.entries(deptCounts)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalToday: totalTodayCount || 0,
        stillIn: stillInCount || 0,
        signedOutToday: signedOutTodayCount || 0,
        totalHistorical: totalHistoricalCount || 0,
        departmentBreakdown,
      });

      setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeRatio = stats.totalToday > 0 ? Math.round((stats.stillIn / stats.totalToday) * 100) : 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs font-semibold">
        Authenticating session...
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Interactive Header Banner with Glass Glow */}
      <div className="glass-panel p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:bg-brand-gold/20"></div>

        <div className="relative z-10 flex items-center space-x-4">
          <div className="bg-brand-gold text-slate-950 p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 font-black animate-gold-pulse">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Live Visitor Analytics</h1>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Real-time monitoring of today's visitor flow, active on-site counts, and department volume.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-[11px] text-slate-400 font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Updated: {lastUpdated || 'Live'} (IST)</span>
          </span>
          <button
            onClick={fetchStats}
            className="p-2.5 bg-slate-800/80 hover:bg-brand-gold hover:text-slate-950 text-slate-300 rounded-xl border border-slate-700 transition-all duration-300 shadow hover:scale-105 active:scale-95"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today's Total Visited */}
        <div className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Today's Visitors</span>
            <div className="p-2.5 bg-amber-400/10 text-brand-gold rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white tracking-tight">{stats.totalToday}</span>
            <span className="text-[11px] text-brand-gold font-bold bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              Today Total
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div className="bg-brand-gold h-full rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Card 2: Still In (On-Site) */}
        <div className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden group border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">Still On-Site (Active)</span>
            <div className="p-2.5 bg-emerald-400/10 text-emerald-400 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white tracking-tight">{stats.stillIn}</span>
            <span className="text-[11px] text-emerald-400 font-extrabold bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800 animate-pulse">
              {activeRatio}% Active Ratio
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(activeRatio, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Signed Out Today */}
        <div className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Signed Out Today</span>
            <div className="p-2.5 bg-slate-800 text-slate-400 rounded-2xl border border-slate-700 group-hover:scale-110 transition-transform">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white tracking-tight">{stats.signedOutToday}</span>
            <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
              Departed
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-slate-500 h-full rounded-full transition-all duration-1000"
              style={{
                width: stats.totalToday > 0 ? `${Math.min(Math.round((stats.signedOutToday / stats.totalToday) * 100), 100)}%` : '0%',
              }}
            ></div>
          </div>
        </div>

        {/* Card 4: Historical Visitor Archive */}
        <div className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Database Logs</span>
            <div className="p-2.5 bg-blue-400/10 text-blue-400 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white tracking-tight">{stats.totalHistorical}</span>
            <span className="text-[11px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-900">
              All Time
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-400 h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      {/* Interactive Department Breakdown Bars */}
      <div className="glass-panel p-6 rounded-3xl shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Building className="w-5 h-5 text-brand-gold" />
            <h2 className="text-base font-bold text-white">Today's Host Department Volume</h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {stats.departmentBreakdown.length} Active Departments
          </span>
        </div>

        {stats.departmentBreakdown.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold">
            No visitor check-ins recorded today yet.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {stats.departmentBreakdown.map((item, idx) => {
              const percentage = stats.totalToday > 0 ? Math.round((item.count / stats.totalToday) * 100) : 0;
              return (
                <div key={item.department} className="space-y-1.5 group">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-200 group-hover:text-brand-gold transition-colors">
                      {idx + 1}. {item.department}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} visitor{item.count > 1 ? 's' : ''} ({percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-brand-gold h-full rounded-full transition-all duration-1000 group-hover:brightness-125"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
