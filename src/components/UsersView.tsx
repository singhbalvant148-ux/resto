import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  KeyRound,
  ShieldCheck,
  Search,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Lock,
  UserCheck,
  UserX,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { User, UserRole } from '../types/pos';
import { isOwner } from '../utils/security';

export const UsersView: React.FC = () => {
  const {
    users,
    addUser,
    editUser,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    currentUser,
    setActiveView,
  } = usePOS();

  // Strict Owner-only access guard
  if (!isOwner(currentUser)) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center max-w-lg mx-auto shadow-2xs my-12 animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-neutral-900">Owner Access Required</h2>
        <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
          ONLY the Restaurant Owner has permission to view staff, create users, assign roles, reset passwords, or enable/disable accounts.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<User | null>(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState<User | null>(null);

  // Add User Form (with double-entry password confirmation)
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'waiter' as UserRole,
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit User Form
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    role: 'waiter' as UserRole,
  });
  const [editError, setEditError] = useState('');

  // Reset Password Form (with double-entry password confirmation)
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');

  // Toast Notification
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Filtered staff list
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'disabled' && u.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const roleBadges: Record<UserRole, { label: string; bg: string; text: string }> = {
    owner: { label: 'Owner', bg: 'bg-amber-100', text: 'text-amber-900' },
    manager: { label: 'Manager', bg: 'bg-blue-100', text: 'text-blue-900' },
    cashier: { label: 'Cashier', bg: 'bg-emerald-100', text: 'text-emerald-900' },
    waiter: { label: 'Waiter', bg: 'bg-purple-100', text: 'text-purple-900' },
    kitchen: { label: 'Kitchen Chef', bg: 'bg-rose-100', text: 'text-rose-900' },
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddForm({
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'waiter',
    });
    setAddError('');
    setShowAddPassword(false);
    setShowAddConfirmPassword(false);
    setIsAddModalOpen(true);
  };

  // Submit Add User
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (addForm.password !== addForm.confirmPassword) {
      setAddError('Passwords do not match. Please enter the same password in both fields.');
      return;
    }

    if (addForm.password.trim().length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    const res = addUser({
      name: addForm.name,
      username: addForm.username,
      password: addForm.password,
      role: addForm.role,
    });

    if (res.success) {
      setIsAddModalOpen(false);
      showNotification(`User "${addForm.name}" created successfully with secure hashed password!`);
    } else {
      setAddError(res.message || 'Could not create user.');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: User) => {
    setEditingEmployee(u);
    setEditForm({
      name: u.name,
      username: u.username,
      role: u.role,
    });
    setEditError('');
  };

  // Submit Edit User
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditError('');

    const res = editUser(editingEmployee.id, {
      name: editForm.name,
      username: editForm.username,
      role: editForm.role,
    });

    if (res.success) {
      setEditingEmployee(null);
      showNotification(`User "${editForm.name}" updated successfully!`);
    } else {
      setEditError(res.message || 'Could not update user.');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (u: User) => {
    setResetPasswordEmployee(u);
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setResetError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Submit Reset Password (double-entry verification)
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordEmployee) return;
    setResetError('');

    if (newPasswordInput !== confirmPasswordInput) {
      setResetError('Passwords do not match. Please re-enter the password in both fields.');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }

    const res = resetUserPassword(resetPasswordEmployee.id, newPasswordInput);
    if (res.success) {
      setResetPasswordEmployee(null);
      showNotification(
        `Password for "${resetPasswordEmployee.name}" reset successfully. Saved with secure salted hash.`
      );
    } else {
      setResetError(res.message || 'Could not reset password.');
    }
  };

  // Toggle Status
  const handleToggleStatus = (u: User) => {
    const res = toggleUserStatus(u.id);
    if (res.success) {
      showNotification(
        u.isActive ? `User "${u.name}" disabled.` : `User "${u.name}" enabled.`
      );
    } else {
      showNotification(res.message || 'Action could not be performed.');
    }
  };

  // Delete User
  const handleDeleteEmployee = (u: User) => {
    const res = deleteUser(u.id);
    if (res.success) {
      setConfirmDeleteEmployee(null);
      showNotification(`User "${u.name}" deleted successfully.`);
    } else {
      showNotification(res.message || 'Could not delete user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white text-xs font-semibold rounded-xl shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Users &amp; Authentication Management
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-neutral-900 text-white rounded-md uppercase tracking-wider">
              Owner Exclusive
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Owner-only control: create staff users, set &amp; reset passwords with double-entry confirmation, change roles, and enable/disable accounts.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>+ Add New User</span>
        </button>
      </div>

      {/* Security Architecture Callout */}
      <div className="bg-neutral-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-800 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Secure Password Storage &amp; RBAC Active</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono">
                SHA-256 + Salt
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Passwords are never stored or displayed in plain text. Only the Owner can create users or reset credentials.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-neutral-300 bg-neutral-800/80 px-3 py-1.5 rounded-lg shrink-0">
          Total Users: <strong className="text-white">{users.length}</strong> · Active: <strong className="text-emerald-400">{users.filter((u) => u.isActive).length}</strong>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, or role..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50"
          />
        </div>

        {/* Role & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role selector */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg text-xs">
            {(['all', 'owner', 'manager', 'cashier', 'waiter', 'kitchen'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors capitalize cursor-pointer ${
                  roleFilter === r
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                statusFilter === 'disabled' ? 'bg-neutral-700 text-white shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            User Directory ({filteredUsers.length})
          </h2>
          <span className="text-[11px] text-neutral-500">
            Roles: Owner, Manager, Cashier, Waiter, Kitchen
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold bg-neutral-50/50">
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Password Security</th>
                <th className="px-4 py-3 text-right">Owner Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400">
                    No users match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = roleBadges[u.role] || {
                    label: u.role,
                    bg: 'bg-neutral-100',
                    text: 'text-neutral-800',
                  };
                  const isOwner = u.role === 'owner';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        !u.isActive ? 'bg-neutral-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                              isOwner
                                ? 'bg-amber-600 text-white'
                                : u.isActive
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-200 text-neutral-500'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900">{u.name}</span>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              ID: {u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
                          @{u.username}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${roleBadge.bg} ${roleBadge.text}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Active/Disabled Status */}
                      <td className="px-4 py-3.5 text-center">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Password Security (never shown in plain text) */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          <Lock className="w-3 h-3 text-neutral-400" />
                          <span>Hashed (Salted)</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* [ Edit ] */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Edit name, username, or role"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* [ Reset Password ] */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(u)}
                            className="px-2 py-1 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Reset password with double confirmation"
                          >
                            <KeyRound className="w-3 h-3 text-amber-700" />
                            <span>Reset Password</span>
                          </button>

                          {/* [ Disable / Enable ] */}
                          <button
                            type="button"
                            disabled={currentUser?.id === u.id}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1 text-xs font-medium rounded border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                              currentUser?.id === u.id
                                ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-400 border-neutral-200'
                                : u.isActive
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={
                              currentUser?.id === u.id
                                ? 'Cannot disable your own active account'
                                : u.isActive
                                ? 'Disable user account'
                                : 'Enable user account'
                            }
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Disable</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Enable</span>
                              </>
                            )}
                          </button>

                          {/* [ Delete ] */}
                          <button
                            type="button"
                            disabled={currentUser?.id === u.id || (isOwner && users.filter((x) => x.role === 'owner').length <= 1)}
                            onClick={() => setConfirmDeleteEmployee(u)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              currentUser?.id === u.id || (isOwner && users.filter((x) => x.role === 'owner').length <= 1)
                                ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW USER (Owner Only, Double Password Entry)  */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Create Staff User</h3>
                  <p className="text-[11px] text-neutral-500">
                    Set full name, username, initial password &amp; role.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh_waiter"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().trim() })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              {/* Initial Password (1st Entry) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter initial password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Initial Password (2nd Entry for double confirmation) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password to confirm"
                    value={addForm.confirmPassword}
                    onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showAddConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  🔒 Password is salted and hashed upon saving. It cannot be viewed in plain text.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Select Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white cursor-pointer"
                >
                  <option value="owner">Owner (Full system, menu &amp; user control)</option>
                  <option value="manager">Manager (View menu, take orders, billing &amp; kitchen)</option>
                  <option value="cashier">Cashier (View menu, take orders, billing counter &amp; receipts)</option>
                  <option value="waiter">Waiter (View menu, take orders, table map &amp; send KOT)</option>
                  <option value="kitchen">Kitchen (KDS food preparation board only)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT USER (Name, Username, Role)                  */}
      {/* ========================================================= */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-bold text-neutral-900">Edit User Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {editError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().trim() })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Select Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white cursor-pointer"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Chef</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RESET PASSWORD (Double-entry confirmation)        */}
      {/* ========================================================= */}
      {resetPasswordEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Reset Password for {resetPasswordEmployee.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordEmployee(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 space-y-1">
                <div>
                  User: <span className="font-semibold text-neutral-900">{resetPasswordEmployee.name}</span>
                </div>
                <div>
                  Username: <span className="font-mono text-neutral-900">@{resetPasswordEmployee.username}</span>
                </div>
              </div>

              {resetError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* New Password (1st entry) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password (2nd entry) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password to confirm"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  🔒 The new password will be hashed with salted SHA-256 and will not be displayed anywhere.
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DELETE USER CONFIRMATION                          */}
      {/* ========================================================= */}
      {confirmDeleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Delete User Account?</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-neutral-900">
                  {confirmDeleteEmployee.name} (@{confirmDeleteEmployee.username})
                </strong>
                ? This user will no longer be able to log in to the POS system.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteEmployee(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEmployee(confirmDeleteEmployee)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
