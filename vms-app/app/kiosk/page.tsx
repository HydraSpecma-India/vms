'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession } from '@/lib/auth';
import WebcamCapture from '@/components/WebcamCapture';
import PassBadgeModal from '@/components/PassBadgeModal';
import ReturningVisitorModal from '@/components/ReturningVisitorModal';
import { UserCheck, Building, Mail, Phone, User, Users, Briefcase, Camera, CheckCircle2, History, ChevronDown, AlertCircle } from 'lucide-react';

interface Employee {
  id: string;
  display_name: string;
  email: string;
  department: string;
  job_title: string;
}

export default function VisitorKioskPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('');
  const [whoToMeet, setWhoToMeet] = useState('');
  const [hostDepartment, setHostDepartment] = useState('');
  const [hostTitle, setHostTitle] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [numberOfVisitors, setNumberOfVisitors] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [isReturningModalOpen, setIsReturningModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredVisitor, setRegisteredVisitor] = useState<any | null>(null);

  const purposeOptions = [
    'Meeting',
    'Interview',
    'Delivery',
    'Maintenance',
    'Client Visit',
    'Personal',
    'Other',
  ];

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    async function loadEmployees() {
      const { data } = await supabase.from('employees').select('*').order('display_name');
      if (data) setEmployees(data);
    }
    loadEmployees();
  }, []);

  const handleHostSearch = (query: string) => {
    setWhoToMeet(query);
    if (!query.trim()) {
      setFilteredEmployees([]);
      setShowEmployeeDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    const matches = employees.filter(
      (e) =>
        e.display_name.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
    setFilteredEmployees(matches.slice(0, 8));
    setShowEmployeeDropdown(true);
  };

  const selectEmployee = (emp: Employee) => {
    setWhoToMeet(emp.display_name);
    setHostDepartment(emp.department || '');
    setHostTitle(emp.job_title || '');
    setHostEmail(emp.email || '');
    setShowEmployeeDropdown(false);
  };

  const handleSelectReturningVisitor = (returning: any) => {
    setFullName(returning.full_name || '');
    setMobile(returning.mobile || '');
    setEmail(returning.email || '');
    setCompany(returning.company || '');
    if (returning.purpose) setPurpose(returning.purpose);
    if (returning.who_to_meet) setWhoToMeet(returning.who_to_meet);
    if (returning.host_department) setHostDepartment(returning.host_department);
    if (returning.photo_url) setPhoto(returning.photo_url);
    setIsReturningModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Mandatory Validation
    if (!fullName.trim() || !mobile.trim()) {
      setErrorMsg('Full Name and Mobile Number are required.');
      return;
    }

    if (!whoToMeet.trim()) {
      setErrorMsg('Host Information (Who to Meet) is mandatory.');
      return;
    }

    if (!photo) {
      setErrorMsg('Visitor Photo is mandatory. Please open camera or upload an image.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: passIdData, error: passIdError } = await supabase.rpc('generate_pass_id');
      
      let passId = passIdData;
      if (passIdError || !passId) {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(100 + Math.random() * 900);
        passId = `VIS-${todayStr}-${randomNum}`;
      }

      let photoUrl = '';

      if (photo && photo.startsWith('data:image')) {
        try {
          const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = `${passId}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('visitor-photos')
            .upload(filePath, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('visitor-photos')
              .getPublicUrl(filePath);
            photoUrl = publicUrlData.publicUrl;
          } else {
            photoUrl = photo;
          }
        } catch (e) {
          photoUrl = photo;
        }
      } else if (photo) {
        photoUrl = photo;
      }

      const visitorRecord = {
        pass_id: passId,
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        company: company.trim(),
        purpose: purpose.trim(),
        who_to_meet: whoToMeet.trim(),
        host_department: hostDepartment.trim(),
        host_title: hostTitle.trim(),
        number_of_visitors: Number(numberOfVisitors) || 1,
        check_in_time: new Date().toISOString(),
        status: 'active',
        photo_url: photoUrl,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('visitors')
        .insert([visitorRecord])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (hostEmail) {
        fetch('/api/notify-host', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor: inserted, hostEmail }),
        }).catch((err) => console.error('Host notification error:', err));
      }

      setRegisteredVisitor(inserted);

      // Reset form
      setFullName('');
      setMobile('');
      setEmail('');
      setCompany('');
      setPurpose('');
      setWhoToMeet('');
      setHostDepartment('');
      setHostTitle('');
      setHostEmail('');
      setNumberOfVisitors(1);
      setPhoto(null);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMsg(err.message || 'Failed to register visitor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* HydraSpecma Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 w-full">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="bg-brand-gold text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Visitor Check-In Kiosk
            </span>
            <span className="text-xs text-brand-gold font-bold">• HydraSpecma Corporate</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Visitor Registration
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Welcome to HydraSpecma India Private Limited! Register below to issue a visitor pass.
          </p>
        </div>

        <div className="flex flex-col items-center sm:items-end">
          <button
            type="button"
            onClick={() => setIsReturningModalOpen(true)}
            className="inline-flex items-center px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-brand-gold/60 text-brand-gold font-bold text-xs rounded-2xl shadow-xl transition transform hover:scale-105"
          >
            <History className="w-4 h-4 mr-2" /> Returning Visitor?
          </button>
          <span className="text-[10px] text-slate-400 mt-1">Quick lookup & re-issue pass</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-2xl text-xs font-semibold flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
          {errorMsg}
        </div>
      )}

      {/* Main Registration Form */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-10 text-slate-100 w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
              <h3 className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-4 flex items-center">
                <Camera className="w-4 h-4 mr-1.5" /> Visitor Photo <span className="text-brand-gold ml-1">*</span>
              </h3>
              <WebcamCapture onCapture={setPhoto} capturedPhoto={photo} />
              <p className="text-[11px] text-slate-400 mt-4 text-center">
                Photo is mandatory for security badge printing.
              </p>
            </div>

            <div className="md:col-span-2 space-y-5">
              <h3 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider">
                Visitor Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Full Name <span className="text-brand-gold">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Mobile Number <span className="text-brand-gold">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 08883666586"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Company / Organization</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 pt-2 uppercase tracking-wider">
                Visit & Host Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Who to Meet (Host) <span className="text-brand-gold">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Search host employee name..."
                      value={whoToMeet}
                      onChange={(e) => handleHostSearch(e.target.value)}
                      onFocus={() => whoToMeet && setShowEmployeeDropdown(true)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>

                  {showEmployeeDropdown && filteredEmployees.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => selectEmployee(emp)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-800 border-b border-slate-800/60 last:border-0 flex flex-col"
                        >
                          <span className="font-bold text-white">{emp.display_name}</span>
                          <span className="text-brand-gold text-[10px]">{emp.department} • {emp.job_title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Host Department</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Engineering"
                      value={hostDepartment}
                      onChange={(e) => setHostDepartment(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Purpose of Visit</label>
                  <div className="relative">
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition appearance-none cursor-pointer"
                    >
                      <option value="">Select purpose of visit</option>
                      {purposeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Number of Visitors</label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={numberOfVisitors}
                      onChange={(e) => setNumberOfVisitors(parseInt(e.target.value) || 1)}
                      className="w-full pl-10 pr-3 py-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3.5 bg-brand-gold text-slate-950 font-black text-sm rounded-xl hover:bg-amber-400 shadow-xl transition disabled:opacity-50"
            >
              {isSubmitting ? (
                'Processing Registration...'
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Register & Issue Visitor Pass
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {isReturningModalOpen && (
        <ReturningVisitorModal
          onSelectVisitor={handleSelectReturningVisitor}
          onClose={() => setIsReturningModalOpen(false)}
        />
      )}

      {registeredVisitor && (
        <PassBadgeModal
          visitor={registeredVisitor}
          onClose={() => setRegisteredVisitor(null)}
        />
      )}
    </div>
  );
}
