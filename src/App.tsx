import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { runAntiGravityInspector, mountAntiGravityPanel } from './lib/antiGravityInspector';

// 🛡️ ANTI-GRAVITY CONTEXT PROVIDERS
import { useAuth } from './contexts/AuthContext';
import { SystemStateProvider } from './contexts/SystemStateProvider';
import { BranchProvider } from './contexts/BranchContext';

// 🏗️ CORE COMPONENTS
import ProtectedRoute from './components/auth/ProtectedRoute';
import FullScreenLoader from './components/FullScreenLoader';

// 📄 PAGES
const DebugAuth = React.lazy(() => import('./pages/auth/DebugAuth'));
const AnalyticsView = React.lazy(() => import('./pages/admin/AnalyticsView'));
import Login from './pages/auth/Login';
import DashboardEngine from './pages/dashboard/DashboardEngine';
import HotelLanding from './pages/HotelLanding';
import RestaurantPublic from './pages/RestaurantPublic';
import BarPublic from './pages/public/BarPublic';
import ServicesHubPublic from './pages/public/ServicesHubPublic';
import LocationRouter from './pages/public/LocationRouter';

// 🔬 DIAGNOSTICS OVERLAY
function DiagnosticsOverlay() {
  const { user, role, isAuthenticated, isLoading, orgId, locationId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Mount floating 🛸 AG Scan button in dev mode
  useEffect(() => {
    if (import.meta.env.DEV) mountAntiGravityPanel();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    await runAntiGravityInspector();
    setScanning(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '72px', right: '15px', zIndex: 10000,
          background: '#00ff00', color: '#000', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 0 10px rgba(0,255,0,0.5)'
        }}>🔬</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '72px', right: '15px', zIndex: 10000,
      background: '#1a1a1a', border: '1px solid #00ff00', padding: '15px', borderRadius: '12px',
      color: '#00ff00', fontFamily: 'monospace', fontSize: '11px', width: '280px',
      boxShadow: '0 0 20px rgba(0,0,0,0.8)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <b style={{ textTransform: 'uppercase' }}>🛸 [ANTI-GRAVITY] STATE</b>
        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#00ff00', cursor: 'pointer' }}>✖</button>
      </div>
      <div>👤 USER: {user?.email || 'GUEST'}</div>
      <div>🎭 ROLE: {role || 'NONE'}</div>
      <div>🔐 AUTH: {isLoading ? '⏳ LOADING' : isAuthenticated ? '✅ READY' : '❌ NO_SESSION'}</div>
      <div>🏢 ORG: {orgId?.substring(0, 8) || 'NONE'}...</div>
      <div>📍 LOC: {locationId?.substring(0, 8) || 'NONE'}...</div>
      <div style={{ marginTop: '5px', color: '#888' }}>{window.location.pathname}</div>
      <hr style={{ borderColor: '#333', margin: '8px 0' }} />
      <button
        onClick={handleScan}
        disabled={scanning}
        style={{
          width: '100%', padding: '6px 0', background: '#7c3aed', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
          fontSize: '11px', letterSpacing: '0.05em', marginBottom: '6px',
          opacity: scanning ? 0.5 : 1
        }}>
        {scanning ? '⏳ Scanning...' : '🛸 Run AG Inspector'}
      </button>
      <div style={{ fontSize: '9px', color: '#aaa' }}>RECOVERY MODE: ACTIVE</div>
    </div>
  );
}

// 🛡️ AUTH GATE: DETERMINISTIC REDIRECTION
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated && role) {
    if (window.location.pathname === '/login') {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <>{children}</>;
};

import { useHydrationGate } from './hooks/useHydrationGate';

import { useSystemSync } from './hooks/useSystemSync';

export default function App() {
  const isHydrated = useHydrationGate();
  const { session } = useAuth();

  // 🛸 ANTI-GRAVITY SYSTEM SYNC (Layer 6)
  // Activates the real-time event-loop and idempotent catch-up loop
  // This ensures the terminal is a 'Mirror of Truth' from the backend
  useSystemSync();

  // 🛸 ANTI-GRAVITY HYDRATION GATE (Step 3)
  // We only gate if there's an active session (authenticated ignition)
  // Public pages (no session) pass through, but slices still hydrate in background if URL-relevant
  if (session && !isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <FullScreenLoader />
        <p className="mt-4 text-emerald-500 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
          Synchronizing Domain Slices: [QR | BAR | POS | BOOKINGS]
        </p>
      </div>
    );
  }

  return (
    <SystemStateProvider>
      <BranchProvider>
        <Toaster position="top-right" />

        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<HotelLanding />} />
            <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
            <Route path="/staff-login" element={<AuthGate><Login /></AuthGate>} />
            <Route path="/menu/:branchId" element={<RestaurantPublic />} />

            {/* 🛸 ANTI-GRAVITY: Public portal routes — previously dead-link loops */}
            <Route path="/l/:branch/:department/:locationId" element={<LocationRouter />} />
            <Route path="/restaurant" element={<RestaurantPublic />} />
            <Route path="/bar" element={<BarPublic />} />
            <Route path="/services" element={<ServicesHubPublic />} />
            {/* Services sub-routes: /services/cleaning, /services/transport, etc. */}
            <Route path="/services/:type" element={<ServicesHubPublic />} />

            <Route path="/analytics" element={<AnalyticsView />} />

            {/* PROTECTED ROUTES (Staff/Admin/Kitchen) */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardEngine />
                </ProtectedRoute>
              }
            />

            {/* FALLBACKS */}
            <Route path="/unauthorized" element={<div className="h-screen flex items-center justify-center bg-gray-900 text-white"><h1>🚫 ACCESS DENIED: Anti-Gravity Violation</h1></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* PERSISTENT MONITORING */}
        <DiagnosticsOverlay />
      </BranchProvider>
    </SystemStateProvider>
  );
}
