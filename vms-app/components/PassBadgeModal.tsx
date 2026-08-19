'use client';

import React from 'react';
import { Printer, Check, X, ShieldCheck } from 'lucide-react';

interface VisitorPassProps {
  visitor: {
    pass_id: string;
    full_name: string;
    mobile: string;
    company?: string;
    purpose?: string;
    who_to_meet?: string;
    host_department?: string;
    host_title?: string;
    number_of_visitors?: number;
    check_in_time?: string;
    photo_url?: string;
  };
  onClose: () => void;
}

export default function PassBadgeModal({ visitor, onClose }: VisitorPassProps) {
  const formattedDateTime = visitor.check_in_time
    ? new Date(visitor.check_in_time).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).toUpperCase()
    : new Date().toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).toUpperCase();

  const handlePrint = () => {
    // Create an isolated hidden iframe specifically for 80mm thermal receipt printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const photoHtml = visitor.photo_url
      ? `<img src="${visitor.photo_url}" style="width: 110px; height: 110px; object-fit: cover; border: 1px solid #000000; display: block; margin: 0 auto;" />`
      : `<div style="width: 110px; height: 110px; border: 1px solid #000000; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin: 0 auto;">[ NO PHOTO ]</div>`;

    const deptHtml = visitor.host_department
      ? `<div style="font-size: 10px; font-weight: 600; margin-top: 2px; color: #1e293b; line-height: 1.2;">${visitor.host_department}</div>`
      : '';

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
            body {
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
            .badge-container {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 4mm 3mm !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .w-full { width: 100%; }
            
            .border-box-solid { border: 1.5px solid #000000; }
            .border-solid-line { border-bottom: 1.5px solid #000000; }
            .border-dotted-line { border-bottom: 1px dotted #a1a1aa; }
            
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: monospace; }
            .font-semibold { font-weight: 600; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="badge-container">
            <div style="text-align: center; width: 100%;">
              <h2 style="font-size: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 0; line-height: 1.2;">
                VISITOR PASS
              </h2>
              <div style="font-weight: 800; font-size: 12px; margin-top: 2px; line-height: 1.2;">
                HydraSpecma India
              </div>
              <div style="border-bottom: 1.5px solid #000000; width: 100%; margin: 6px 0;"></div>
            </div>

            <!-- Pass ID Box -->
            <div style="width: 100%; border: 1.5px solid #000000; text-align: center; padding: 4px; margin: 4px 0;">
              <span style="font-family: monospace; font-weight: 900; font-size: 13px; letter-spacing: 1px;">
                ${visitor.pass_id}
              </span>
            </div>

            <!-- Photo -->
            <div style="margin: 8px 0; width: 100%; text-align: center;">
              ${photoHtml}
            </div>

            <!-- Info Rows with explicit display: flex and justify-content: space-between -->
            <div style="width: 100%; font-size: 11px; line-height: 1.3; margin: 6px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #a1a1aa; padding: 4px 0;">
                <span style="font-weight: 800; text-transform: uppercase;">NAME</span>
                <span style="font-weight: 700; text-align: right; word-break: break-word; padding-left: 8px;">${visitor.full_name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #a1a1aa; padding: 4px 0;">
                <span style="font-weight: 800; text-transform: uppercase;">COMPANY</span>
                <span style="font-weight: 500; text-align: right; word-break: break-word; padding-left: 8px;">${visitor.company || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #a1a1aa; padding: 4px 0;">
                <span style="font-weight: 800; text-transform: uppercase;">MOBILE</span>
                <span style="font-weight: 500; text-align: right; padding-left: 8px;">${visitor.mobile}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #a1a1aa; padding: 4px 0;">
                <span style="font-weight: 800; text-transform: uppercase;">PURPOSE</span>
                <span style="font-weight: 500; text-align: right; padding-left: 8px;">${visitor.purpose || 'General'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #a1a1aa; padding: 4px 0;">
                <span style="font-weight: 800; text-transform: uppercase;">VISITORS</span>
                <span style="font-weight: 500; text-align: right; padding-left: 8px;">${visitor.number_of_visitors || 1}</span>
              </div>
            </div>

            <!-- Host Box with Department Under Host Name -->
            <div style="width: 100%; border: 1.5px solid #000000; padding: 8px; margin: 8px 0; text-align: left;">
              <div style="font-weight: 900; font-size: 10px; text-transform: uppercase; line-height: 1;">TO MEET:</div>
              <div style="font-weight: 700; font-size: 12px; margin-top: 4px; line-height: 1.2;">${visitor.who_to_meet || '-'}</div>
              ${deptHtml}
            </div>

            <div style="width: 100%; text-align: center; margin: 6px 0;">
              <div style="border-bottom: 1.5px solid #000000; width: 100%; margin-bottom: 4px;"></div>
              <span style="font-weight: 800; font-size: 11px; text-transform: uppercase;">
                CHECK-IN: <span style="font-weight: 400;">${formattedDateTime}</span>
              </span>
              <div style="border-bottom: 1.5px solid #000000; width: 100%; margin-top: 4px;"></div>
            </div>

            <div style="width: 100%; text-align: center; margin-top: 24px; margin-bottom: 8px;">
              <div style="border-bottom: 1.5px solid #000000; width: 75%; margin: 0 auto 4px auto;"></div>
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                HOST SIGNATURE
              </span>
            </div>

            <div style="width: 100%; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px dotted #a1a1aa; font-size: 8px; color: #334155; line-height: 1.2;">
              <p style="margin: 0;">This pass must be worn visibly at all times.</p>
              <p style="margin: 2px 0 0 0;">Please return pass at security gate upon departure.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
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

        {/* Clean 80mm Thermal Receipt Badge Printable Area */}
        <div className="p-4 bg-white text-black flex justify-center overflow-x-auto">
          <div
            id="printable-badge"
            className="w-[280px] bg-white text-black p-3 font-sans flex flex-col items-center border border-slate-200"
            style={{ color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
          >
            {/* Top Title Header */}
            <div className="text-center w-full">
              <h2 className="text-base font-black tracking-wider uppercase text-black leading-tight">
                VISITOR PASS
              </h2>
              <div className="font-extrabold text-xs text-black leading-tight mt-0.5">
                HydraSpecma India
              </div>
              <div className="border-b-2 border-black w-full my-1.5"></div>
            </div>

            {/* Enclosed Pass ID Box */}
            <div className="w-full border-box-solid text-center py-1.5 px-1 my-1">
              <span className="font-mono font-black text-sm tracking-wider text-black">
                {visitor.pass_id}
              </span>
            </div>

            {/* Centered Photo */}
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

            {/* Visitor Info Field Rows */}
            <div className="w-full text-xs leading-snug my-1.5">
              <div className="flex justify-between border-dotted-line py-1">
                <span className="font-extrabold uppercase text-black">NAME</span>
                <span className="font-bold text-right text-black break-words pl-2">{visitor.full_name}</span>
              </div>

              <div className="flex justify-between border-dotted-line py-1">
                <span className="font-extrabold uppercase text-black">COMPANY</span>
                <span className="font-medium text-right text-black break-words pl-2">{visitor.company || '-'}</span>
              </div>

              <div className="flex justify-between border-dotted-line py-1">
                <span className="font-extrabold uppercase text-black">MOBILE</span>
                <span className="font-medium text-right text-black pl-2">{visitor.mobile}</span>
              </div>

              <div className="flex justify-between border-dotted-line py-1">
                <span className="font-extrabold uppercase text-black">PURPOSE</span>
                <span className="font-medium text-right text-black pl-2">{visitor.purpose || 'General'}</span>
              </div>

              <div className="flex justify-between border-dotted-line py-1">
                <span className="font-extrabold uppercase text-black">VISITORS</span>
                <span className="font-medium text-right text-black pl-2">{visitor.number_of_visitors || 1}</span>
              </div>
            </div>

            {/* Enclosed Host Box with Department Under Host Name */}
            <div className="w-full border-box-solid p-2 my-2 text-left">
              <span className="font-black text-[10px] uppercase block leading-none text-black">TO MEET:</span>
              <span className="font-bold text-xs block mt-1 leading-tight text-black">{visitor.who_to_meet || '-'}</span>
              {visitor.host_department && (
                <span className="text-[10px] block text-slate-800 font-semibold mt-1 leading-tight">{visitor.host_department}</span>
              )}
            </div>

            {/* Check-In Timestamp */}
            <div className="w-full text-center my-1.5">
              <div className="border-b-2 border-black w-full mb-1"></div>
              <span className="font-extrabold text-xs uppercase text-black">
                CHECK-IN: <span className="font-normal">{formattedDateTime}</span>
              </span>
              <div className="border-b-2 border-black w-full mt-1"></div>
            </div>

            {/* Host Signature Line */}
            <div className="w-full text-center mt-6 mb-2">
              <div className="border-b-2 border-black w-3/4 mx-auto mb-1"></div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-black">
                HOST SIGNATURE
              </span>
            </div>

            {/* Bottom Security Footer Notice */}
            <div className="w-full text-center mt-2 pt-2 border-t border-dotted border-slate-400 text-[8px] text-slate-800 leading-tight">
              <p className="margin-0">This pass must be worn visibly at all times.</p>
              <p className="margin-0">Please return pass at security gate upon departure.</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="bg-slate-950 px-6 py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 border-t border-slate-800 no-print">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition flex items-center justify-center"
          >
            <X className="w-4 h-4 mr-1.5" /> Close
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-gold hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center"
          >
            <Printer className="w-4 h-4 mr-2" /> Print 80mm Pass Badge
          </button>
        </div>
      </div>
    </div>
  );
}
