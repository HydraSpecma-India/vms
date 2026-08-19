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

  const checkInDate = new Date(visitor.check_in_time);
  
  // Format: 19-Aug-2026 12:00 PM
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(checkInDate.getDate()).padStart(2, '0');
  const monthStr = months[checkInDate.getMonth()];
  const year = checkInDate.getFullYear();
  let hours = checkInDate.getHours();
  const minutes = String(checkInDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');

  const formattedDateTime = `${day}-${monthStr}-${year} ${formattedHours}:${minutes} ${ampm}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Header (hidden in print) */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-gold" />
            <h3 className="font-bold text-base text-white">80mm Visitor Badge Ready</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Printer Printable Area */}
        <div className="p-4 bg-white text-black flex justify-center overflow-x-auto">
          <div
            id="printable-badge"
            className="w-[280px] sm:w-[300px] bg-white text-black p-3 font-sans flex flex-col items-center border border-slate-200"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Top Header */}
            <div className="text-center w-full">
              <h2 className="text-lg font-black tracking-widest uppercase text-black">
                VISITOR PASS
              </h2>
              <div className="flex items-center justify-center space-x-1 font-extrabold text-base text-black mt-0.5">
                <span>HydraSpecma</span>
              </div>
              <div className="border-b-2 border-black w-full my-2"></div>
            </div>

            {/* Enclosed Pass ID Box */}
            <div className="w-full border-2 border-black text-center py-1.5 px-2 my-1">
              <span className="font-mono font-black text-base tracking-wider text-black">
                {visitor.pass_id}
              </span>
            </div>

            {/* Visitor Photo */}
            <div className="my-2 flex justify-center">
              {visitor.photo_url ? (
                <img
                  src={visitor.photo_url}
                  alt={visitor.full_name}
                  className="w-32 h-32 object-cover border-2 border-black rounded-none"
                />
              ) : (
                <div className="w-32 h-32 border-2 border-black flex items-center justify-center text-xs font-bold text-black">
                  [ NO PHOTO ]
                </div>
              )}
            </div>

            {/* Field Details Table */}
            <div className="w-full text-xs space-y-1.5 my-2">
              <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                <span className="font-extrabold uppercase w-24">NAME</span>
                <span className="font-medium text-right flex-1 break-words">{visitor.full_name}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                <span className="font-extrabold uppercase w-24">COMPANY</span>
                <span className="font-medium text-right flex-1 break-words">{visitor.company || '-'}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                <span className="font-extrabold uppercase w-24">MOBILE</span>
                <span className="font-medium text-right flex-1">{visitor.mobile}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                <span className="font-extrabold uppercase w-24">PURPOSE</span>
                <span className="font-medium text-right flex-1">{visitor.purpose || 'General'}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                <span className="font-extrabold uppercase w-24">VISITORS</span>
                <span className="font-medium text-right flex-1">{visitor.number_of_visitors || 1}</span>
              </div>
            </div>

            {/* Enclosed Host Box */}
            <div className="w-full border-2 border-black p-2 my-2 text-left">
              <span className="font-black text-xs uppercase block">TO MEET:</span>
              <span className="font-bold text-sm block mt-0.5">{visitor.who_to_meet || '-'}</span>
              {visitor.host_department && (
                <span className="text-[11px] block text-slate-700 font-semibold">{visitor.host_department}</span>
              )}
            </div>

            {/* Check-In Timestamp */}
            <div className="w-full text-center my-1.5">
              <div className="border-b border-black w-full mb-1"></div>
              <span className="font-bold text-xs uppercase text-black">
                CHECK-IN: <span className="font-normal">{formattedDateTime}</span>
              </span>
              <div className="border-b border-black w-full mt-1"></div>
            </div>

            {/* Host Signature Line */}
            <div className="w-full text-center mt-6 mb-2">
              <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
              <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">
                HOST SIGNATURE
              </span>
            </div>

            {/* Security Notice Footer */}
            <div className="w-full text-center mt-2 pt-2 border-t border-dotted border-slate-400 text-[9px] text-slate-600 space-y-0.5 leading-tight">
              <p>This pass must be worn visibly at all times.</p>
              <p>Please return this pass at the security gate upon departure.</p>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons (hidden in print) */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex space-x-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center px-5 py-3 bg-brand-gold text-slate-950 font-black text-sm rounded-xl hover:bg-amber-400 shadow-xl transition"
          >
            <Printer className="w-4 h-4 mr-2" /> Print 80mm Badge
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
