import React, { useState } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  UtensilsCrossed,
  ChefHat,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  PlusCircle,
  ChevronRight,
  Users,
  UserPlus,
  Edit2,
  KeyRound,
  UserX,
  UserCheck,
  ShieldCheck,
  Shield,
  Lock,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { User, UserRole } from '../types/pos';
import { isOwner as checkIsOwner } from '../utils/security';

export const DashboardView: React.FC = () => {
  const {
    bills,
    orders,
    tables,
    kots,
    setActiveView,
    setActiveTableId,
    setBillToPrint,
    currentUser,
    users,
    addUser,
    editUser,
    toggleUserStatus,
    resetUserPassword,
  } = usePOS();

  const isOwner = Boolean(currentUser && checkIsOwner(currentUser));

  // Calculate Today's sales
  const todayTotalSales = bills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalBillsCount = bills.length;
  const activeOrdersCount = orders.filter((o) => o.status === 'active').length;
  const totalOrdersToday = totalBillsCount + activeOrdersCount;

  const openTablesCount = tables.filter((t) => t.status === 'available').length;
  const occupiedTablesCount = tables.filter((t) => t.status === 'occupied').length;
  const billedTablesCount = tables.filter((t) => t.status === 'billed').length;

  const activeKOTCount = kots.filter((k) => k.status === 'new' || k.status === 'preparing').length;

  // Recent orders list
  const recentOrders = [...orders].slice(0, 6);

  // Quick navigate to table ordering
  const handleOpenTableOrder = (tableId: number) => {
    setActiveTableId(tableId);
    setActiveView('menu');
  };

  // -------------------------------------------------------------
  // Owner Dashboard Users / Employee Management State & Handlers
  // -------------------------------------------------------------
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<User | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'waiter' as UserRole,
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    role: 'waiter' as UserRole,
  });
  const [editError, setEditError] = useState('');

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleOpenAddModal = () => {
    setAddForm({ name: '', username: '', password: '', role: 'waiter' });
    setAddError('');
    setShowAddPassword(false);
    setIsAddEmployeeModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const res = addUser({
      name: addForm.name,
      username: addForm.username,
      password: addForm.password,
      role: addForm.role,
    });
    if (res.success) {
      setIsAddEmployeeModalOpen(false);
      showNotification(`Employee "${addForm.name}" created successfully!`);
    } else {
      setAddError(res.message || 'Could not create employee.');
    }
  };

  const handleOpenEditModal = (emp: User) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name,
      username: emp.username,
      role: emp.role,
    });
    setEditError('');
  };

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
      showNotification(`Employee "${editForm.name}" updated successfully!`);
    } else {
      setEditError(res.message || 'Could not update employee.');
    }
  };

  const handleOpenResetPassword = (emp: User) => {
    setResetPasswordEmployee(emp);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setShowResetPassword(false);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordEmployee) return;
    setResetError('');
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }
    const res = resetUserPassword(resetPasswordEmployee.id, newPassword);
    if (res.success) {
      setResetPasswordEmployee(null);
      showNotification(`Password for "${resetPasswordEmployee.name}" reset successfully.`);
    } else {
      setResetError(res.message || 'Could not reset password.');
    }
  };

  const handleToggleStatus = (emp: User) => {
    const res = toggleUserStatus(emp.id);
    if (res.success) {
      showNotification(
        emp.isActive
          ? `Employee "${emp.name}" disabled.`
          : `Employee "${emp.name}" enabled.`
      );
    } else {
      alert(res.message || 'Could not update status.');
    }
  };

  // Separate Owner account from employees
  const ownerUser = users.find((u) => u.role === 'owner');
  const employees = users.filter((u) => u.role !== 'owner');

  const roleBadges: Record<UserRole, { label: string; bg: string; text: string }> = {
    owner: { label: 'Owner', bg: 'bg-amber-100', text: 'text-amber-900' },
    manager: { label: 'Manager', bg: 'bg-blue-100', text: 'text-blue-900' },
    cashier: { label: 'Cashier', bg: 'bg-emerald-100', text: 'text-emerald-900' },
    waiter: { label: 'Waiter', bg: 'bg-purple-100', text: 'text-purple-900' },
    kitchen: { label: 'Kitchen Chef', bg: 'bg-rose-100', text: 'text-rose-900' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {isOwner ? 'Owner Overview & Operations Dashboard' : 'Operations Dashboard'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time restaurant performance and floor activity · Logged in as{' '}
            <span className="font-semibold text-neutral-800">{currentUser?.name}</span> (
            <span className="capitalize font-medium">{currentUser?.role}</span>)
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setActiveView('users')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users Page</span>
            </button>
          )}
          <button
            onClick={() => setActiveView('tables')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Table Map</span>
          </button>
          <button
            onClick={() => {
              const firstAvail = tables.find((t) => t.status === 'available') || tables[0];
              setActiveTableId(firstAvail.id);
              setActiveView('menu');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Take New Order</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales (Restricted strictly to Owner) or Floor Tables for Staff */}
        {isOwner ? (
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-medium uppercase tracking-wider">Today&apos;s Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-neutral-900 font-mono-numbers">
                ₹{todayTotalSales.toLocaleString('en-IN')}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                <span>{totalBillsCount} settled bills</span>
                <span>·</span>
                <span className="text-emerald-700 font-medium">Avg ₹{Math.round(todayTotalSales / (totalBillsCount || 1))}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-medium uppercase tracking-wider">Available Tables</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-neutral-900 font-mono-numbers">
                {openTablesCount} / {tables.length}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                <span>{occupiedTablesCount} occupied dining</span>
                <span>·</span>
                <span className="text-emerald-700 font-medium">Ready for guests</span>
              </div>
            </div>
          </div>
        )}

        {/* Orders Today */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Orders Today</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900 font-mono-numbers">
              {totalOrdersToday}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
              <span className="text-amber-700 font-medium">{activeOrdersCount} running active</span>
              <span>·</span>
              <span className="text-emerald-700">{totalBillsCount} completed</span>
            </div>
          </div>
        </div>

        {/* Open Tables */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Tables Status</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900 font-mono-numbers">
              {openTablesCount} <span className="text-sm font-normal text-neutral-500">/ 12 Open</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
              <span className="text-amber-700 font-medium">{occupiedTablesCount} occupied</span>
              <span>·</span>
              <span className="text-blue-700 font-medium">{billedTablesCount} billed</span>
            </div>
          </div>
        </div>

        {/* Kitchen KOTs */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Active Kitchen KOTs</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900 font-mono-numbers">
              {activeKOTCount}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
              <button
                onClick={() => setActiveView('kitchen')}
                className="text-purple-700 font-medium hover:underline flex items-center gap-0.5"
              >
                <span>Open Kitchen Display</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* OWNER-ONLY USERS SECTION (Directly on Owner Dashboard)             */}
      {/* ------------------------------------------------------------------ */}
      {isOwner && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-neutral-900" />
                <h2 className="text-base font-bold text-neutral-900">Users (Employee Management)</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Owner Access Only
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage your staff team, create accounts, assign roles, and control active status
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add New Employee</span>
              </button>
            </div>
          </div>

          {/* Protected Owner Account Display (Kept Separate & Protected) */}
          {ownerUser && (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">{ownerUser.name}</span>
                    <span className="text-[11px] font-mono text-amber-900 font-semibold bg-amber-100 px-2 py-0.2 rounded">
                      @{ownerUser.username}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900 text-white uppercase">
                      Owner Account
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-0.5">
                    Protected Primary Administrator Account · Cannot be altered by employee operations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Protected & Separate</span>
              </div>
            </div>
          )}

          {/* Employee List Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800">
                Employees List ({employees.length})
              </span>
              <span className="text-[11px] text-neutral-500">
                Roles: Manager, Cashier, Waiter, Kitchen
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold bg-neutral-50/50">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Username</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5 text-center">Active/Disabled Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-neutral-400">
                        No employees added yet. Click &quot;+ Add New Employee&quot; above.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => {
                      const roleBadge = roleBadges[emp.role] || {
                        label: emp.role,
                        bg: 'bg-neutral-100',
                        text: 'text-neutral-800',
                      };

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-neutral-50/70 transition-colors ${
                            !emp.isActive ? 'bg-neutral-50/50 opacity-70' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-neutral-900">{emp.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                              @{emp.username}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${roleBadge.bg} ${roleBadge.text}`}
                            >
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                Disabled
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit employee */}
                              <button
                                onClick={() => handleOpenEditModal(emp)}
                                className="px-2 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors inline-flex items-center gap-1"
                                title="Edit employee"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Reset password */}
                              <button
                                onClick={() => handleOpenResetPassword(emp)}
                                className="px-2 py-1 text-xs font-medium text-neutral-700 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors inline-flex items-center gap-1"
                                title="Reset employee password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Reset Password</span>
                              </button>

                              {/* Disable / Enable toggle */}
                              <button
                                onClick={() => handleToggleStatus(emp)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors inline-flex items-center gap-1 ${
                                  emp.isActive
                                    ? 'text-rose-700 hover:bg-rose-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={emp.isActive ? 'Disable employee' : 'Enable employee'}
                              >
                                {emp.isActive ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Disable</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Enable</span>
                                  </>
                                )}
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
        </div>
      )}

      {/* Main Grid: Live Floor Status & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Floor Quick View (12 Tables Mini Matrix) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Floor Overview ({tables.length} Tables)</h2>
              <p className="text-[11px] text-neutral-500">Click any table to view or take order</p>
            </div>
            <button
              onClick={() => setActiveView('tables')}
              className="text-xs text-neutral-700 font-medium hover:underline flex items-center gap-1"
            >
              <span>View Floor Map</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {tables.map((t) => {
              const tableOrder = orders.find((o) => o.id === t.activeOrderId);
              const orderTotal = tableOrder
                ? tableOrder.items.reduce((s, it) => s + it.price * it.quantity, 0)
                : 0;

              let statusBg = 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-900';
              let badgeColor = 'bg-emerald-600';
              if (t.status === 'occupied') {
                statusBg = 'bg-amber-50 border-amber-300 hover:border-amber-400 text-amber-900';
                badgeColor = 'bg-amber-600';
              } else if (t.status === 'billed') {
                statusBg = 'bg-blue-50 border-blue-300 hover:border-blue-400 text-blue-900';
                badgeColor = 'bg-blue-600';
              }

              return (
                <button
                  key={t.id}
                  onClick={() => handleOpenTableOrder(t.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all hover:shadow-xs flex flex-col justify-between h-20 ${statusBg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">{t.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`}></span>
                  </div>
                  <div>
                    {t.status === 'available' ? (
                      <span className="text-[10px] text-emerald-700 font-medium">Free</span>
                    ) : (
                      <span className="text-[11px] font-bold font-mono-numbers block truncate">
                        ₹{orderTotal}
                      </span>
                    )}
                    <span className="text-[9px] text-neutral-400 block">{t.capacity} seats</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-600 mt-4 pt-3 border-t border-neutral-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Available ({openTablesCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Occupied ({occupiedTablesCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Billed ({billedTablesCount})
            </span>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Recent Running & Paid Orders</h2>
              <p className="text-[11px] text-neutral-500">Live order status and totals</p>
            </div>
            <button
              onClick={() => setActiveView('orders')}
              className="text-xs text-neutral-700 font-medium hover:underline flex items-center gap-1"
            >
              <span>All Orders</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2 text-right">Total (₹)</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((ord) => {
                  const itemsCount = ord.items.reduce((s, it) => s + it.quantity, 0);
                  const total = ord.items.reduce((s, it) => s + it.price * it.quantity, 0);

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 font-semibold text-neutral-900 font-mono-numbers">
                        #{ord.orderNumber}
                      </td>
                      <td className="py-2.5 font-medium text-neutral-800">
                        Table {ord.tableId}
                      </td>
                      <td className="py-2.5 text-neutral-600">
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-neutral-900 font-mono-numbers">
                        ₹{total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-center">
                        {ord.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <Clock className="w-3 h-3" /> Active
                          </span>
                        )}
                        {ord.status === 'billed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                            <Receipt className="w-3 h-3" /> Billed
                          </span>
                        )}
                        {ord.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {ord.status === 'active' ? (
                          <button
                            onClick={() => {
                              setActiveTableId(ord.tableId);
                              setActiveView('menu');
                            }}
                            className="text-xs font-semibold text-neutral-900 hover:underline"
                          >
                            Open Cart
                          </button>
                        ) : ord.status === 'billed' ? (
                          <button
                            onClick={() => {
                              setActiveTableId(ord.tableId);
                              setActiveView('billing');
                            }}
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Settle Bill
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal 1: Add New Employee */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-bold text-neutral-900">Add New Employee</h3>
              </div>
              <button
                onClick={() => setIsAddEmployeeModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Create Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh_waiter"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Select Role
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                >
                  <option value="manager">Manager (Operations, orders & billing)</option>
                  <option value="cashier">Cashier (Billing counter & settlements)</option>
                  <option value="waiter">Waiter (Table ordering & sending KOTs)</option>
                  <option value="kitchen">Kitchen (KDS food preparation board)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Employee */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-bold text-neutral-900">Edit Employee</h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
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

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Select Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                >
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {resetPasswordEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Reset Password for {resetPasswordEmployee.name}
                </h3>
              </div>
              <button
                onClick={() => setResetPasswordEmployee(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 space-y-1">
                <div>
                  Employee: <span className="font-semibold text-neutral-900">{resetPasswordEmployee.name}</span>
                </div>
                <div>
                  Username: <span className="font-mono text-neutral-900">@{resetPasswordEmployee.username}</span>
                </div>
              </div>

              {resetError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordEmployee(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
