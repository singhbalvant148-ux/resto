import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { UserRole } from '../types/pos';

export const LoginView: React.FC = () => {
  const { login, settings, users } = usePOS();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.message || 'Invalid username or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleDetails: Record<
    UserRole,
    { label: string; bg: string; text: string; desc: string; access: string[] }
  > = {
    owner: {
      label: 'Owner',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      desc: 'Full system control, User Management, Menu Management, GST & Financial Reports',
      access: ['User & Password Management', 'Menu & Price Management', 'Tables & Billing', 'Daily Sales & Reports'],
    },
    manager: {
      label: 'Manager',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      desc: 'Floor operations, view menu & take orders, kitchen oversight & billing',
      access: ['View Menu & Take Orders', 'Tables & Orders', 'Kitchen KOT', 'Billing Counter'],
    },
    cashier: {
      label: 'Cashier',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      desc: 'Handles table bills, view menu & take orders, cash/UPI payments, receipts',
      access: ['View Menu & Take Orders', 'Billing Counter', 'Cash / UPI / Card', 'Print Receipts'],
    },
    waiter: {
      label: 'Waiter',
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      desc: 'Table service, view menu & take orders, and sends KOT to kitchen',
      access: ['Table Map', 'View Menu & Take Orders', 'Send KOT Tickets', 'Order Status'],
    },
    kitchen: {
      label: 'Kitchen Chef',
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      desc: 'Live kitchen order screen (KDS) to track preparation and mark dishes ready',
      access: ['Kitchen KDS View', 'KOT Tickets', 'Dish Preparation Status', 'Special Instructions'],
    },
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white font-bold text-xl shadow-md mb-3">
          ₹
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {settings.name || 'PRIMECENTURY RESTAURANT & CAFE'}
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Restaurant Point of Sale · Secure Role-Based Authentication
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sign In Credentials Card */}
        <div className="lg:col-span-5 bg-white py-8 px-6 shadow-sm border border-neutral-200 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-base font-bold text-neutral-900">Sign In to POS</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Enter your assigned username and password to log in.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Enter username"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>
            </div>

            {/* Password Input (Masked) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-neutral-200">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Passwords secured with salted SHA-256 hashing</span>
            </div>
          </div>
        </div>

        {/* Registered Staff Accounts Reference Panel */}
        <div className="lg:col-span-7 bg-white p-6 shadow-sm border border-neutral-200 rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Staff Accounts &amp; Roles ({users.length})</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Each user authenticates with their own credentials. Click &quot;Select&quot; to quickly populate the username field.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {users.map((user) => {
              const details = roleDetails[user.role];
              const isSelected = username.toLowerCase() === user.username.toLowerCase();

              return (
                <div
                  key={user.id}
                  className={`p-3.5 border rounded-xl transition-all ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-50/90 shadow-2xs'
                      : user.isActive
                      ? 'border-neutral-200 bg-white hover:bg-neutral-50/70'
                      : 'border-neutral-200 bg-neutral-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900">{user.name}</span>
                        <span className="text-[11px] font-mono text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded font-semibold">
                          @{user.username}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${details?.bg} ${details?.text}`}
                        >
                          {details?.label}
                        </span>
                        {!user.isActive && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                            Disabled
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-600 mt-1">{details?.desc}</p>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-neutral-500">
                        {details?.access.map((acc, i) => (
                          <span key={i} className="flex items-center gap-1 text-neutral-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            {acc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!user.isActive}
                      onClick={() => {
                        setUsername(user.username);
                        setPassword('');
                        setError('');
                      }}
                      className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white'
                          : user.isActive
                          ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                          : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                      title={user.isActive ? `Fill username as @${user.username}` : 'Account disabled'}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
            <span className="font-semibold text-neutral-800">Initial Default Passwords:</span>{' '}
            Owner: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">Kite@29</code> · Manager: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">mgr123</code> · Cashier: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">cash123</code> · Waiter: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">wait123</code> · Kitchen: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">kitchen123</code>
          </div>
        </div>
      </div>
    </div>
  );
};
