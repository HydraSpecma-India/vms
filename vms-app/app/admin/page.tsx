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
} from 'lucide-react';
import Papa from 'papaparse';

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
  const [activeTab, setActiveTab] = useState<'employees' | 'users'>('employees');

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
    fetchEmployees();
    fetchUsers();
  }, [router]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('display_name');
    setEmployees(data || []);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('app_users').select('id, username, role, requires_password_change').order('username');
    setAppUsers(data || []);
  };

  // Employee CRUD Actions
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
        setMsg({ type: 'success', text: 'Employee details updated successfully!' });
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
        setMsg({ type: 'success', text: 'New employee added successfully!' });
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
      alert('Cannot delete the primary admin account.');
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-gold p-3 rounded-2xl text-slate-950 shadow font-black">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Admin Control Panel</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage Employee Directory CRUD & System User Access Credentials
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
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
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-brand-gold text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>System Users ({appUsers.length})</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employees Tab Content */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
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

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
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
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-brand-gold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 shadow transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create System User
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
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

      {/* Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white">
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Department</label>
                <input
                  type="text"
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Job Title</label>
                <input
                  type="text"
                  value={empTitle}
                  onChange={(e) => setEmpTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-slate-950 font-bold rounded-lg hover:bg-amber-400"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white">
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="user">User / Reception Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <p className="text-[11px] text-amber-400">
                Note: New users are forced to change their password on first login.
              </p>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-slate-950 font-bold rounded-lg hover:bg-amber-400"
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
