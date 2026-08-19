'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStoredSession, hashPasswordAsync } from '@/lib/auth';
import {
  Shield,
  UserCog,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  KeyRound,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  Clock,
  Phone,
  Building,
} from 'lucide-react';

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
  number_of_visitors: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  photo_url?: string;
}

interface Employee {
  id: string;
  display_name: string;
  email?: string;
  department?: string;
  job_title?: string;
}

interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  requires_password_change: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'visitors' | 'employees' | 'users'>('visitors');

  // Visitor CRUD State
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);
  
  // Visitor Form Fields
  const [visName, setVisName] = useState('');
  const [visMobile, setVisMobile] = useState('');
  const [visEmail, setVisEmail] = useState('');
  const [visCompany, setVisCompany] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visHost, setVisHost] = useState('');
  const [visDept, setVisDept] = useState('');
  const [visCount, setVisCount] = useState(1);
  const [visStatus, setVisStatus] = useState('active');

  // Employee State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empTitle, setEmpTitle] = useState('');

  // User Management State
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const [isLoading, setIsLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const s = getStoredSession();
    if (!s || s.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchVisitors();
    fetchEmployees();
    fetchUsers();
  }, [router]);

  const fetchVisitors = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('visitors').select('*').order('check_in_time', { ascending: false });
    setVisitors(data || []);
    setIsLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('display_name');
    setEmployees(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('app_users').select('id, username, role, requires_password_change').order('username');
    setAppUsers(data || []);
  };

  // Visitor CRUD Handlers
  const openEditVisitorModal = (v: VisitorRecord) => {
    setEditingVisitor(v);
    setVisName(v.full_name);
    setVisMobile(v.mobile);
    setVisEmail(v.email || '');
    setVisCompany(v.company || '');
    setVisPurpose(v.purpose || '');
    setVisHost(v.who_to_meet || '');
    setVisDept(v.host_department || '');
    setVisCount(v.number_of_visitors || 1);
    setVisStatus(v.status || 'active');
    setIsVisitorModalOpen(true);
  };

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visName.trim() || !visMobile.trim() || !editingVisitor) return;

    try {
      const updateData: any = {
        full_name: visName.trim(),
        mobile: visMobile.trim(),
        email: visEmail.trim(),
        company: visCompany.trim(),
        purpose: visPurpose.trim(),
        who_to_meet: visHost.trim(),
        host_department: visDept.trim(),
        number_of_visitors: Number(visCount) || 1,
        status: visStatus,
      };

      if (visStatus === 'signed-out' && !editingVisitor.check_out_time) {
        updateData.check_out_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('visitors')
        .update(updateData)
        .eq('id', editingVisitor.id);

      if (error) throw error;

      setMsg({ type: 'success', text: `Visitor record '${editingVisitor.pass_id}' updated!` });
      setIsVisitorModalOpen(false);
      fetchVisitors();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update visitor record.' });
    }
  };

  const handleDeleteVisitor = async (id: string, passId: string) => {
    if (!confirm(`Are you sure you want to delete visitor record '${passId}'?`)) return;
    try {
      const { error } = await supabase.from('visitors').delete().eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: `Visitor '${passId}' deleted successfully.` });
      fetchVisitors();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete visitor record.' });
    }
  };

  // Employee CRUD Handlers
  const openCreateEmpModal = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpEmail('');
    setEmpDept('');
    setEmpTitle('');
    setIsEmpModalOpen(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpName(emp.display_name);
    setEmpEmail(emp.email || '');
    setEmpDept(emp.department || '');
    setEmpTitle(emp.job_title || '');
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    try {
      if (editingEmp) {
        const { error } = await supabase
          .from('employees')
          .update({
            display_name: empName.trim(),
            email: empEmail.trim(),
            department: empDept.trim(),
            job_title: empTitle.trim(),
          })
          .eq('id', editingEmp.id);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Employee details updated!' });
      } else {
        const { error } = await supabase.from('employees').insert([
          {
            display_name: empName.trim(),
            email: empEmail.trim(),
            department: empDept.trim(),
            job_title: empTitle.trim(),
          },
        ]);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Employee added!' });
      }
      setIsEmpModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save employee.' });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Employee deleted.' });
      fetchEmployees();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete employee.' });
    }
  };

  // User Management Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim()) return;

    try {
      const salt = 'vms_salt_2026';
      const passwordHash = await hashPasswordAsync(newUserPassword.trim(), salt);

      const { error } = await supabase.from('app_users').insert([
        {
          username: newUsername.trim().toLowerCase(),
          password_hash: passwordHash,
          salt: salt,
          role: newUserRole,
          requires_password_change: true,
        },
      ]);

      if (error) throw error;

      setMsg({ type: 'success', text: `User '${newUsername}' created successfully!` });
      setIsUserModalOpen(false);
      setNewUsername('');
      setNewUserPassword('');
      fetchUsers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'admin') {
      alert('Cannot delete primary admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    try {
      const { error } = await supabase.from('app_users').delete().eq('username', username);
      if (error) throw error;
      setMsg({ type: 'success', text: `User '${username}' deleted.` });
      fetchUsers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete user.' });
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    if (!visitorSearch.trim()) return true;
    const q = visitorSearch.toLowerCase();
    return (
      v.full_name.toLowerCase().includes(q) ||
      v.mobile.includes(q) ||
      v.pass_id.toLowerCase().includes(q) ||
      (v.company && v.company.toLowerCase().includes(q)) ||
      (v.who_to_meet && v.who_to_meet.toLowerCase().includes(q))
    );
  });

  const filteredEmployees = employees.filter((emp) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    return (
      emp.display_name.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-gold p-3 rounded-2xl text-slate-950 shadow font-black">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Admin Management System</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Full CRUD for Visitor Records, Employee Directory & System Users
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'visitors'
                ? 'bg-brand-gold text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Visitors CRUD ({visitors.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'employees'
                ? 'bg-brand-gold text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>Employees ({employees.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-brand-gold text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users ({appUsers.length})</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow ${
            msg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Visitors CRUD Tab */}
      {activeTab === 'visitors' && (
        <div className="space-y-4 w-full">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search visitor records by name, mobile, pass ID, company..."
              value={visitorSearch}
              onChange={(e) => setVisitorSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition shadow"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Pass ID</th>
                    <th className="px-4 py-3">Visitor Name</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Host & Dept</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredVisitors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-brand-gold whitespace-nowrap">{v.pass_id}</td>
                      <td className="px-4 py-3 font-bold text-white">{v.full_name}</td>
                      <td className="px-4 py-3">{v.mobile}</td>
                      <td className="px-4 py-3">{v.company || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-200">{v.who_to_meet || '-'}</span>
                        {v.host_department && <span className="block text-slate-400 text-[10px]">{v.host_department}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(v.check_in_time).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            v.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEditVisitorModal(v)}
                          className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Edit Visitor Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVisitor(v.id, v.pass_id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Delete Visitor Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employees Tab Content */}
      {activeTab === 'employees' && (
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search employees..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-brand-gold focus:outline-none transition"
              />
            </div>

            <button
              onClick={openCreateEmpModal}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-brand-gold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 shadow transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Employee
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-bold text-white">{emp.display_name}</td>
                      <td className="px-4 py-3 text-slate-400">{emp.email || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-brand-gold">{emp.department || '-'}</td>
                      <td className="px-4 py-3">{emp.job_title || '-'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEditEmpModal(emp)}
                          className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4 w-full">
          <div className="flex justify-end">
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-brand-gold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 shadow transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create System User
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Must Change Password</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {appUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-bold text-white">{u.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-amber-400/20 text-brand-gold border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.requires_password_change ? (
                        <span className="text-amber-400 font-bold">Yes (First Login Pending)</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.username)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visitor Edit Modal */}
      {isVisitorModalOpen && editingVisitor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base">Edit Visitor Record ({editingVisitor.pass_id})</h3>
              <button onClick={() => setIsVisitorModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisitor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={visName}
                    onChange={(e) => setVisName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Mobile *</label>
                  <input
                    type="text"
                    required
                    value={visMobile}
                    onChange={(e) => setVisMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={visEmail}
                    onChange={(e) => setVisEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Company</label>
                  <input
                    type="text"
                    value={visCompany}
                    onChange={(e) => setVisCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Who to Meet (Host)</label>
                  <input
                    type="text"
                    value={visHost}
                    onChange={(e) => setVisHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Host Department</label>
                  <input
                    type="text"
                    value={visDept}
                    onChange={(e) => setVisDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Purpose</label>
                  <input
                    type="text"
                    value={visPurpose}
                    onChange={(e) => setVisPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Status</label>
                  <select
                    value={visStatus}
                    onChange={(e) => setVisStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="active">Active (On-Site)</option>
                    <option value="signed-out">Signed Out</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVisitorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-slate-950 font-bold rounded-xl hover:bg-amber-400"
                >
                  Save Visitor Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base">
                {editingEmp ? 'Edit Employee Record' : 'Add New Employee'}
              </h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Display Name *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Department</label>
                <input
                  type="text"
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Job Title</label>
                <input
                  type="text"
                  value={empTitle}
                  onChange={(e) => setEmpTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-slate-950 font-bold rounded-xl hover:bg-amber-400"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base">Create New System User</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="user">User / Reception Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-slate-950 font-bold rounded-xl hover:bg-amber-400"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
