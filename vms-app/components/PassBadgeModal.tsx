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
    const badgeElement = document.getElementById('printable-badge');
    if (!badgeElement) {
      window.print();
      return;
    }

    // Create a hidden print iframe to isolate ONLY the badge content
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    const badgeHtml = badgeElement.outerHTML;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Visitor Pass - ${visitor.pass_id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box !important;
            }
            #printable-badge {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 4mm 3mm !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .w-full { width: 100%; }
            .flex { display: flex; }
            .flex-col { display: flex; flex-direction: column; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .flex-1 { flex: 1 1 0%; }
            .border { border: 1px solid #000000; }
            .border-b { border-bottom: 1px solid #000000; }
            .border-b-2 { border-bottom: 2px solid #000000; }
            .border-dotted { border-style: dotted; border-color: #94a3b8; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: monospace; }
            .font-semibold { font-weight: 600; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .my-1.5 { margin-top: 6px; margin-bottom: 6px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .mt-0.5 { margin-top: 2px; }
            .mt-1 { margin-top: 4px; }
            .mt-5 { margin-top: 20px; }
            .mb-1 { margin-bottom: 4px; }
            .py-0.5 { padding-top: 2px; padding-bottom: 2px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .px-1 { padding-left: 4px; padding-right: 4px; }
            .p-1.5 { padding: 6px; }
            .p-3 { padding: 12px; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            .text-base { font-size: 15px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[8.5px\\] { font-size: 8.5px; }
            .leading-tight { line-height: 1.2; }
            .leading-snug { line-height: 1.3; }
            .leading-none { line-height: 1; }
            .w-28 { width: 112px; }
            .h-28 { height: 112px; }
            .w-20 { width: 80px; }
            .w-3\\/4 { width: 75%; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .object-cover { object-fit: cover; }
            .break-words { overflow-wrap: break-word; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-0.5 > * + * { margin-top: 2px; }
          </style>
        </head>
        <body>
          ${badgeHtml}
        </body>
      </html>
    `);
    iframeDoc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  const checkInDate = new Date(visitor.check_in_time);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print-backdrop">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Modal Header (hidden in print) */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-gold" />
            <h3 className="font-bold text-base text-white">80mm Badge Ready</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Printer Badge Container */}
        <div className="p-4 bg-white text-black flex justify-center overflow-x-auto">
          <div
            id="printable-badge"
            className="w-[280px] bg-white text-black p-3 font-sans flex flex-col items-center border border-slate-200"
            style={{ color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
          >
            {/* Top Header */}
            <div className="text-center w-full">
              <h2 className="text-base font-black tracking-widest uppercase text-black leading-tight">
                VISITOR PASS
              </h2>
              <div className="font-extrabold text-xs text-black leading-tight mt-0.5">
                HydraSpecma
              </div>
              <div className="border-b border-black w-full my-1.5"></div>
            </div>

            {/* Enclosed Pass ID Box */}
            <div className="w-full border border-black text-center py-1 px-1 my-1">
              <span className="font-mono font-black text-sm tracking-wider text-black">
                {visitor.pass_id}
              </span>
            </div>

            {/* Photo */}
            <div className="my-2 flex justify-center">
              {visitor.photo_url ? (
                <img
                  src={visitor.photo_url}
                  alt={visitor.full_name}
                  className="w-28 h-28 object-cover border border-black rounded-none"
                />
              ) : (
                <div className="w-28 h-28 border border-black flex items-center justify-center text-xs font-bold text-black">
                  [ NO PHOTO ]
                </div>
              )}
            </div>

            {/* Field Rows */}
            <div className="w-full text-xs leading-snug space-y-1 my-1.5">
              <div className="flex justify-between border-b border-dotted border-slate-400 pb-0.5">
                <span className="font-extrabold uppercase w-20">NAME</span>
                <span className="font-bold text-right flex-1 break-words">{visitor.full_name}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-0.5">
                <span className="font-extrabold uppercase w-20">COMPANY</span>
                <span className="font-medium text-right flex-1 break-words">{visitor.company || '-'}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-0.5">
                <span className="font-extrabold uppercase w-20">MOBILE</span>
                <span className="font-medium text-right flex-1">{visitor.mobile}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-0.5">
                <span className="font-extrabold uppercase w-20">PURPOSE</span>
                <span className="font-medium text-right flex-1">{visitor.purpose || 'General'}</span>
              </div>

              <div className="flex justify-between border-b border-dotted border-slate-400 pb-0.5">
                <span className="font-extrabold uppercase w-20">VISITORS</span>
                <span className="font-medium text-right flex-1">{visitor.number_of_visitors || 1}</span>
              </div>
            </div>

            {/* Enclosed Host Box */}
            <div className="w-full border border-black p-1.5 my-1.5 text-left">
              <span className="font-black text-[10px] uppercase block leading-none">TO MEET:</span>
              <span className="font-bold text-xs block mt-0.5 leading-tight">{visitor.who_to_meet || '-'}</span>
              {visitor.host_department && (
                <span className="text-[10px] block text-slate-800 font-semibold leading-tight">{visitor.host_department}</span>
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
            <div className="w-full text-center mt-5 mb-1">
              <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
              <span className="text-[9px] font-bold text-slate-700 tracking-wider uppercase">
                HOST SIGNATURE
              </span>
            </div>

            {/* Return Notice Footer */}
            <div className="w-full text-center mt-1.5 pt-1.5 border-t border-dotted border-slate-400 text-[8.5px] text-slate-700 leading-tight space-y-0.5">
              <p>This pass must be worn visibly at all times.</p>
              <p>Please return pass at security gate upon departure.</p>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons (hidden in print) */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex space-x-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center px-5 py-3 bg-brand-gold text-slate-950 font-black text-sm rounded-xl hover:bg-amber-400 shadow-xl transition"
          >
            <Printer className="w-4 h-4 mr-2" /> Print 80mm Badge Only
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
