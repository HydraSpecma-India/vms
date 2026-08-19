'use client';

import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface Visitor {
  pass_id: string;
  full_name: string;
  mobile: string;
  company?: string;
  purpose?: string;
  who_to_meet?: string;
  host_department?: string;
  host_title?: string;
  number_of_visitors?: number;
  check_in_time: string;
  photo_url?: string;
}

interface PassBadgeModalProps {
  visitor: Visitor;
  onClose: () => void;
}

export default function PassBadgeModal({ visitor, onClose }: PassBadgeModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(visitor.check_in_time).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header (hidden in print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Visitor Pass Issued</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Body */}
        <div id="printable-badge" className="p-6 bg-white flex flex-col items-center text-center">
          <div className="w-full border-b-2 border-blue-600 pb-3 mb-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              HydraSpecma
            </h2>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
              VISITOR PASS
            </p>
          </div>

          <div className="my-2">
            {visitor.photo_url ? (
              <img
                src={visitor.photo_url}
                alt={visitor.full_name}
                className="w-32 h-32 object-cover rounded-xl border-2 border-slate-300 shadow-sm mx-auto"
              />
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-slate-300 flex items-center justify-center text-slate-400 font-medium text-xs mx-auto">
                No Photo
              </div>
            )}
          </div>

          <div className="mt-3">
            <span className="inline-block bg-slate-900 text-white font-mono text-sm font-bold px-3 py-1 rounded-md tracking-wider">
              {visitor.pass_id}
            </span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mt-3">{visitor.full_name}</h3>
          {visitor.company && (
            <p className="text-sm font-semibold text-slate-600">{visitor.company}</p>
          )}

          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Host / Meeting:</span>
              <span className="font-semibold text-slate-900">{visitor.who_to_meet || 'N/A'}</span>
            </div>
            {visitor.host_department && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-semibold text-slate-900">{visitor.host_department}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Purpose:</span>
              <span className="font-semibold text-slate-900">{visitor.purpose || 'General'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Group Size:</span>
              <span className="font-semibold text-slate-900">{visitor.number_of_visitors || 1} person(s)</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500 font-medium">Check-In:</span>
              <span className="font-semibold text-slate-900">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Footer actions (hidden in print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex space-x-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 shadow-sm transition"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Visitor Pass
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
