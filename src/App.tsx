import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { RequestAccess } from './pages/RequestAccess';
import { AdminRoute } from './routes/AdminRoute';
import { CloudAssistant } from './components/CloudAssistant';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { ToastNotification } from './components/ToastNotification';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Planning = lazy(() => import('./pages/Planning').then(module => ({ default: module.Planning })));
const Costs = lazy(() => import('./pages/Costs').then(module => ({ default: module.Costs })));
const Infrastructure = lazy(() => import('./pages/Infrastructure').then(module => ({ default: module.Infrastructure })));
const Security = lazy(() => import('./pages/Security').then(module => ({ default: module.Security })));
const NetworkPage = lazy(() => import('./pages/Network').then(module => ({ default: module.NetworkPage })));
const Services = lazy(() => import('./pages/Services').then(module => ({ default: module.Services })));
const AccessRequests = lazy(() => import('./pages/admin/AccessRequests').then(module => ({ default: module.AccessRequests })));

const MainLayout: React.FC = () => {
  const { proposalsError, proposalsLoading, loadProposals } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 font-sans transition-colors">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {proposalsLoading && <p role="status" className="mb-4 text-sm">Cargando propuestas…</p>}
          {proposalsError && <div role="alert" className="error-box mb-4">{proposalsError} <button className="underline" onClick={() => void loadProposals()}>Reintentar</button></div>}
          <Suspense fallback={<p role="status" className="py-10 text-center">Cargando módulo…</p>}><Outlet /></Suspense>
        </main>

        <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          CloudOps &copy; 2026 · Entorno de simulación
        </footer>
      </div>
      <ServiceDetailModal />
      <ToastNotification />
      <CloudAssistant />
    </div>
  );
};

function Workspace() {
  const { user } = useAuth();
  return <AppProvider key={user!.id}><MainLayout /></AppProvider>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/request-access" element={<RequestAccess />} />
    <Route element={<ProtectedRoute />}><Route element={<Workspace />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/planning" element={<Planning />} />
      <Route path="/costs" element={<Costs />} />
      <Route path="/infrastructure" element={<Infrastructure />} />
      <Route path="/security" element={<Security />} />
      <Route path="/network" element={<NetworkPage />} />
      <Route path="/services" element={<Services />} />
      <Route element={<AdminRoute />}><Route path="/admin/access-requests" element={<AccessRequests />} /></Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
