'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import WebcamCapture from '@/components/WebcamCapture';
import PassBadgeModal from '@/components/PassBadgeModal';
import { UserCheck, Building, Mail, Phone, User, Users, Briefcase, Camera, CheckCircle2 } from 'lucide-react';

interface Employee {
  id: string;
  display_name: string;
  email: string;
  department: string;
  job_title: string;
}

export default function VisitorKioskPage() {
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredVisitor, setRegisteredVisitor] = useState<any | null>(null);

  // Load employees for host auto-complete
  useEffect(() => {
    async function loadEmployees() {
      const { data, error } = await supabase.from('employees').select('*').order('display_name');
      if (data) {
        setEmployees(data);
      }
    }
    loadEmployees();
  }, []);

  // Filter employee search
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !mobile.trim()) {
      setErrorMsg('Full Name and Mobile Number are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Generate atomic Pass ID via Supabase function
      const { data: passIdData, error: passIdError } = await supabase.rpc('generate_pass_id');
      
      let passId = passIdData;
      if (passIdError || !passId) {
        // Fallback pass ID generator
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(100 + Math.random() * 900);
        passId = `VIS-${todayStr}-${randomNum}`;
      }

      let photoUrl = '';

      // 2. Upload photo to Supabase storage if provided
      if (photo) {
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
            photoUrl = photo; // base64 fallback
          }
        } catch (e) {
          photoUrl = photo;
        }
      }

      // 3. Insert visitor record into Supabase
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

      // 4. Send background email alert to host
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-block bg-blue-500/30 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            Self-Service Kiosk
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Visitor Registration</h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Welcome to HydraSpecma! Please fill in your details below to receive your visitor pass.
          </p>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center">
          <UserCheck className="w-12 h-12 text-blue-200 mx-auto" />
          <span className="text-xs font-bold text-white uppercase mt-1 block">Pass Badge Instant Print</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Main Registration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Photo Capture */}
            <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                <Camera className="w-4 h-4 mr-1.5 text-blue-600" /> Visitor Photo
              </h3>
              <WebcamCapture onCapture={setPhoto} capturedPhoto={photo} />
              <p className="text-xs text-slate-400 mt-3 text-center">
                Snap a clear photo for your visitor badge pass.
              </p>
            </div>

            {/* Right: Personal & Visit Details */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                Visitor Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 pt-2">
                Visit & Host Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Host Auto-complete */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Who to Meet (Host)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search employee name..."
                      value={whoToMeet}
                      onChange={(e) => handleHostSearch(e.target.value)}
                      onFocus={() => whoToMeet && setShowEmployeeDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>

                  {showEmployeeDropdown && filteredEmployees.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => selectEmployee(emp)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex flex-col"
                        >
                          <span className="font-semibold text-slate-800">{emp.display_name}</span>
                          <span className="text-slate-500">{emp.department} • {emp.job_title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Host Department</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Engineering"
                      value={hostDepartment}
                      onChange={(e) => setHostDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Visit</label>
                  <input
                    type="text"
                    placeholder="e.g. Business Meeting / Maintenance"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Visitors</label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={numberOfVisitors}
                      onChange={(e) => setNumberOfVisitors(parseInt(e.target.value) || 1)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold text-base rounded-xl hover:bg-blue-700 shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Processing Registration...</>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Register & Issue Visitor Pass
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal for Visitor Pass Badge */}
      {registeredVisitor && (
        <PassBadgeModal
          visitor={registeredVisitor}
          onClose={() => setRegisteredVisitor(null)}
        />
      )}
    </div>
  );
}
