import React, { useState } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { TablesView } from './components/TablesView';
import { MenuView } from './components/MenuView';
import { OrdersView } from './components/OrdersView';
import { KitchenView } from './components/KitchenView';
import { BillingView } from './components/BillingView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { MenuManagementView } from './components/MenuManagementView';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { KOTModal } from './components/KOTModal';
import { ShieldAlert, ArrowRight } from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    hasPermission,
    billToPrint,
    setBillToPrint,
    kotToPrint,
    setKotToPrint,
  } = usePOS();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // If not logged in, render the clean login view
  if (!currentUser) {
    return <LoginView />;
  }

  // Permission check
  const isAllowed = hasPermission(activeView);

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isAllowed ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center max-w-lg mx-auto shadow-2xs my-12">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-neutral-900">Access Restricted</h2>
            <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
              Your current role ({currentUser.role.toUpperCase()}) does not have permission to view the{' '}
              <span className="font-semibold">{activeView}</span> section.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() =>
                  setActiveView(currentUser.role === 'kitchen' ? 'kitchen' : 'dashboard')
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to Allowed Screen
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'tables' && <TablesView />}
            {activeView === 'menu' && <MenuView />}
            {activeView === 'orders' && <OrdersView />}
            {activeView === 'kitchen' && <KitchenView />}
            {activeView === 'billing' && <BillingView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'users' && <UsersView />}
            {activeView === 'menu_management' && <MenuManagementView />}
          </>
        )}
      </main>

      {/* Global Modals */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {billToPrint && <ReceiptModal bill={billToPrint} onClose={() => setBillToPrint(null)} />}
      {kotToPrint && <KOTModal kot={kotToPrint} onClose={() => setKotToPrint(null)} />}
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <MainApp />
    </POSProvider>
  );
}
