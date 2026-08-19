'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, UserCheck, Phone, Building, History, Check } from 'lucide-react';

interface VisitorRecord {
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
  photo_url?: string;
}

interface ReturningVisitorModalProps {
  onSelectVisitor: (visitor: VisitorRecord) => void;
  onClose: () => void;
}

export default function ReturningVisitorModal({ onSelectVisitor, onClose }: ReturningVisitorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<VisitorRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const q = searchQuery.trim().toLowerCase();
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .or(`mobile.ilike.%${q}%,full_name.ilike.%${q}%,company.ilike.%${q}%`)
        .order('check_in_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter unique visitors by mobile number to show latest profile per visitor
      const uniqueMap = new Map<string, VisitorRecord>();
      (data || []).forEach((v) => {
        const key = v.mobile || v.full_name;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, v);
        }
      });

      setResults(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error('Returning visitor search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-brand-gold" />
            <h3 className="font-bold text-lg text-white">Find Returning Visitor</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                autoFocus
                placeholder="Enter Mobile Number or Full Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 bg-brand-gold text-slate-900 font-bold text-sm rounded-xl hover:bg-amber-400 transition shadow disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results List */}
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {isSearching ? (
              <p className="text-center py-6 text-slate-400 text-xs">Searching visitor records...</p>
            ) : hasSearched && results.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-semibold">No returning visitors found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching with a different mobile number or register as a new visitor.
                </p>
              </div>
            ) : (
              results.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onSelectVisitor(v)}
                  className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-brand-gold rounded-xl cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3">
                    {v.photo_url ? (
                      <img
                        src={v.photo_url}
                        alt={v.full_name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-700 text-brand-gold font-bold flex items-center justify-center text-base border border-slate-600">
                        {v.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 group-hover:text-brand-gold transition">
                        {v.full_name}
                      </h4>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1 text-slate-500" /> {v.mobile}
                        </span>
                        {v.company && (
                          <span className="flex items-center">
                            <Building className="w-3 h-3 mr-1 text-slate-500" /> {v.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold group-hover:text-slate-900 font-bold text-xs rounded-lg transition flex items-center"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Select Profile
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
