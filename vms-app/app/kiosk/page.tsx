'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import PassBadgeModal from '@/components/PassBadgeModal';
import { saveVisitorOffline, getPendingOfflineVisitors, syncOfflineQueue } from '@/lib/offlineSync';
import {
  UserCheck,
  Camera,
  RotateCcw,
  Users,
  Search,
  CheckCircle2,
  Building,
  User,
  Phone,
  Mail,
  HelpCircle,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';

interface Employee {
  id: string;
  display_name: string;
  email?: string;
  department?: string;
  job_title?: string;
}

const PURPOSES = [
  'Official Meeting',
  'Interview',
  'Vendor / Supplier',
  'Maintenance / Service',
  'Delivery / Logistics',
  'Audit / Inspection',
  'Personal Visit',
];

export default function KioskPage() {
  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('Official Meeting');
  const [whoToMeet, setWhoToMeet] = useState('');
  const [numberOfVisitors, setNumberOfVisitors] = useState(1);

  // Photo & Camera State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Employees & Returning Visitor Lookup
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hostSearch, setHostSearch] = useState('');
  const [isHostDropdownOpen, setIsHostDropdownOpen] = useState(false);
  const [selectedHostObj, setSelectedHostObj] = useState<Employee | null>(null);

  const [returningSearch, setReturningSearch] = useState('');
  const [isSearchingReturning, setIsSearchingReturning] = useState(false);
  const [returningMsg, setReturningMsg] = useState<string | null>(null);

  // Submit & Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passVisitorData, setPassVisitorData] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase.from('employees').select('*').order('display_name');
      if (data) setEmployees(data);
    } catch (err) {
      console.warn('Network offline while fetching employees list.');
    }
  };

  // Camera Management
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please allow camera permissions in your browser.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Returning Visitor Auto-Fill
  const handleSearchReturningVisitor = async () => {
    if (!returningSearch.trim()) return;
    setIsSearchingReturning(true);
    setReturningMsg(null);

    const q = returningSearch.trim();
    const { data } = await supabase
      .from('visitors')
      .select('*')
      .or(`mobile.eq.${q},full_name.ilike.%${q}%`)
      .order('check_in_time', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastVis = data[0];
      setFullName(lastVis.full_name || '');
      setMobile(lastVis.mobile || '');
      setEmail(lastVis.email || '');
      setCompany(lastVis.company || '');
      if (lastVis.photo_url) setPhotoDataUrl(lastVis.photo_url);
      setReturningMsg(`Found past profile for '${lastVis.full_name}'. Details auto-filled!`);
    } else {
      setReturningMsg('No matching returning visitor found.');
    }
    setIsSearchingReturning(false);
  };

  // Form Submit Handler with Offline Fallback & Auto-Sync
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setOfflineNotice(null);

    if (!fullName.trim() || !mobile.trim()) {
      setValidationError('Please fill in required fields (Full Name and Mobile).');
      return;
    }
    if (!whoToMeet.trim()) {
      setValidationError('Please select who you are meeting (Host Employee).');
      return;
    }
    if (!photoDataUrl) {
      setValidationError('Visitor photo is mandatory. Please capture a photo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const passId = `VIS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      const hostDept = selectedHostObj?.department || '';
      const hostTitle = selectedHostObj?.job_title || '';
      const hostEmail = selectedHostObj?.email || '';

      const visitorRecord = {
        pass_id: passId,
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        company: company.trim(),
        purpose: purpose.trim(),
        who_to_meet: whoToMeet.trim(),
        host_department: hostDept,
        host_title: hostTitle,
        number_of_visitors: Number(numberOfVisitors) || 1,
        check_in_time: new Date().toISOString(),
        status: 'active',
        photo_url: photoDataUrl,
      };

      // Check if device is offline or if network request fails
      if (!navigator.onLine) {
        // Save to IndexedDB offline queue
        await saveVisitorOffline({
          ...visitorRecord,
          hostEmail,
        });

        setOfflineNotice(' Saved offline! Record queued & badge generated. Will sync automatically when connected.');
        setPassVisitorData(visitorRecord);
        resetForm();
        setIsSubmitting(false);
        return;
      }

      // Online Path: Upload photo and insert to Supabase
      let finalPhotoUrl = photoDataUrl;
      if (photoDataUrl.startsWith('data:image')) {
        const res = await fetch(photoDataUrl);
        const blob = await res.blob();
        const fileName = `${passId}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('visitor-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('visitor-photos')
            .getPublicUrl(fileName);
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('visitors')
        .insert([
          {
            ...visitorRecord,
            photo_url: finalPhotoUrl,
          },
        ])
        .select()
        .single();

      if (error) {
        // If Supabase insert errors out due to network issues, fallback to offline queue!
        await saveVisitorOffline({
          ...visitorRecord,
          hostEmail,
        });
        setOfflineNotice(' Saved offline! Record queued & badge generated.');
        setPassVisitorData(visitorRecord);
      } else {
        // Trigger host notification email
        if (hostEmail) {
          fetch('/api/notify-host', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostEmail, visitor: data }),
          }).catch((err) => console.warn('Email notify error:', err));
        }
        setPassVisitorData(data || visitorRecord);
      }

      resetForm();
    } catch (err: any) {
      console.error('Check-in error:', err);
      // Failover to offline queue
      const fallbackRecord = {
        pass_id: `VIS-OFFLINE-${Date.now()}`,
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        company: company.trim(),
        purpose: purpose.trim(),
        who_to_meet: whoToMeet.trim(),
        host_department: selectedHostObj?.department || '',
        number_of_visitors: Number(numberOfVisitors) || 1,
        check_in_time: new Date().toISOString(),
        status: 'active',
        photo_url: photoDataUrl,
      };

      await saveVisitorOffline({
        ...fallbackRecord,
        hostEmail: selectedHostObj?.email || '',
      });

      setOfflineNotice(' Saved offline! Pass badge generated.');
      setPassVisitorData(fallbackRecord);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setEmail('');
    setCompany('');
    setWhoToMeet('');
    setSelectedHostObj(null);
    setNumberOfVisitors(1);
    setPhotoDataUrl(null);
    stopCamera();
  };

  const filteredHosts = employees.filter((emp) => {
    if (!hostSearch.trim()) return true;
    const q = hostSearch.toLowerCase();
    return (
      emp.display_name.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <UserCheck className="w-7 h-7 text-brand-gold" />
            <h1 className="text-2xl font-black text-white">Visitor Registration Kiosk</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Complete visitor check-in form. Mandatory photo capture and host selection required.
          </p>
        </div>

        {/* Returning Visitor Quick Lookup */}
        <div className="w-full md:w-auto bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Returning Visitor Mobile / Name..."
            value={returningSearch}
            onChange={(e) => setReturningSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchReturningVisitor()}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl focus:ring-1 focus:ring-brand-gold focus:outline-none"
          />
          <button
            onClick={handleSearchReturningVisitor}
            disabled={isSearchingReturning}
            className="px-3 py-1.5 bg-brand-gold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 shrink-0"
          >
            {isSearchingReturning ? 'Searching...' : 'Auto-Fill'}
          </button>
        </div>
      </div>

      {returningMsg && (
        <div className="p-3 bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-semibold rounded-2xl">
          {returningMsg}
        </div>
      )}

      {offlineNotice && (
        <div className="p-3.5 bg-amber-950/90 border border-amber-800 text-amber-300 text-xs font-bold rounded-2xl flex items-center">
          <WifiOff className="w-4 h-4 mr-2 shrink-0 text-amber-400" />
          <span>{offlineNotice}</span>
        </div>
      )}

      {validationError && (
        <div className="p-3.5 bg-rose-950/90 border border-rose-800 text-rose-300 text-xs font-bold rounded-2xl flex items-center">
          <ShieldAlert className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Visitor & Host Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter visitor full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter 10-digit mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="visitor@company.com (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Company / Organization</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Visitor's company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purpose of Visit Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Purpose of Visit *</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Visitors */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Number of Visitors</label>
              <input
                type="number"
                min={1}
                max={50}
                value={numberOfVisitors}
                onChange={(e) => setNumberOfVisitors(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>
          </div>

          {/* Mandatory Host Selection Search */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Who to Meet (Host Employee) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Search and select host employee..."
                value={whoToMeet}
                onChange={(e) => {
                  setWhoToMeet(e.target.value);
                  setHostSearch(e.target.value);
                  setIsHostDropdownOpen(true);
                }}
                onFocus={() => setIsHostDropdownOpen(true)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>

            {/* Host Employee Dropdown */}
            {isHostDropdownOpen && filteredHosts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto z-30 shadow-2xl divide-y divide-slate-900">
                {filteredHosts.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setWhoToMeet(emp.display_name);
                      setSelectedHostObj(emp);
                      setIsHostDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-xs flex justify-between items-center transition"
                  >
                    <div>
                      <span className="font-bold text-white block">{emp.display_name}</span>
                      {emp.job_title && (
                        <span className="text-[10px] text-slate-400">{emp.job_title}</span>
                      )}
                    </div>
                    {emp.department && (
                      <span className="text-[10px] font-bold text-brand-gold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {emp.department}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mandatory Camera Photo Capture */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Visitor Photo *</span>
              <span className="text-[10px] text-brand-gold uppercase font-extrabold">Mandatory</span>
            </h2>

            <div className="mt-4 flex flex-col items-center justify-center">
              {photoDataUrl ? (
                <div className="relative group">
                  <img
                    src={photoDataUrl}
                    alt="Visitor Capture"
                    className="w-48 h-48 object-cover rounded-2xl border-2 border-brand-gold shadow-2xl"
                  />
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 inline-flex items-center px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake Photo
                  </button>
                </div>
              ) : isCameraActive ? (
                <div className="space-y-3 text-center">
                  <div className="w-48 h-48 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-brand-gold text-slate-950 font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg"
                  >
                    📸 Capture Visitor Photo
                  </button>
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">No photo captured</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 px-4 py-2 bg-slate-800 text-brand-gold font-bold text-xs rounded-xl hover:bg-slate-700 transition"
                  >
                    Start Web Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-brand-gold text-slate-950 font-black text-sm rounded-2xl hover:bg-amber-400 transition shadow-2xl flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? (
              'Processing Check-In...'
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" /> Register & Generate 80mm Pass
              </>
            )}
          </button>
        </div>
      </form>

      {/* 80mm Thermal Receipt Badge Printable Modal */}
      {passVisitorData && (
        <PassBadgeModal
          visitor={passVisitorData}
          onClose={() => setPassVisitorData(null)}
        />
      )}
    </div>
  );
}
