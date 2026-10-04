import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { ToastNotification } from './components/ToastNotification';

import { Dashboard } from './pages/Dashboard';
import { Planning } from './pages/Planning';
import { Costs } from './pages/Costs';
import { Infrastructure } from './pages/Infrastructure';
import { Security } from './pages/Security';
import { NetworkPage } from './pages/Network';
import { Services } from './pages/Services';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'planning':
        return <Planning />;
      case 'costs':
        return <Costs />;
      case 'infrastructure':
        return <Infrastructure />;
      case 'security':
        return <Security />;
      case 'network':
        return <NetworkPage />;
      case 'services':
        return <Services />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar Navigation Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>

        <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          CloudOps Dashboard &copy; 2026 - AWS Cloud Foundations (Semanas 5 y 6). Desarrollado con React + TypeScript + Tailwind CSS.
        </footer>
      </div>

      {/* Modals & Toasts */}
      <ServiceDetailModal />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
