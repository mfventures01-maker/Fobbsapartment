import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🛡️ ANTI-GRAVITY CONTEXT PROVIDERS
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SystemStateProvider } from './contexts/SystemStateProvider';
import { BranchProvider } from './contexts/BranchContext';

// 🏗️ CORE COMPONENTS
import ProtectedRoute from './components/auth/ProtectedRoute';
import FullScreenLoader from './components/FullScreenLoader';

// 📄 PAGES
import Login from './pages/auth/Login';
import DashboardEngine from './pages/dashboard/DashboardEngine';
import HotelLanding from './pages/HotelLanding';
import RestaurantPublic from './pages/RestaurantPublic';

// 🔬 DIAGNOSTICS OVERLAY
function DiagnosticsOverlay() {
  const { user, role, isAuthenticated, isLoading, businessId, branchId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '15px', right: '15px', zIndex: 10000,
          background: '#00ff00', color: '#000', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 0 10px rgba(0,255,0,0.5)'
        }}>🔬</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '15px', right: '15px', zIndex: 10000,
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
      <div>🏢 BIZ: {businessId?.substring(0, 8) || 'NONE'}...</div>
      <div>📍 LOC: {branchId?.substring(0, 8) || 'NONE'}...</div>
      <div style={{ marginTop: '5px', color: '#888' }}>{window.location.pathname}</div>
      <hr style={{ borderColor: '#333', margin: '8px 0' }} />
      <div style={{ fontSize: '9px', color: '#aaa' }}>RECOVERY MODE: ACTIVE</div>
    </div>
  );
}

// 🛡️ AUTH GATE: DETERMINISTIC REDIRECTION
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated && role) {
    // If they land on root or login while authenticated, push to dashboard
    if (window.location.pathname === '/' || window.location.pathname === '/login') {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <SystemStateProvider>
        <BranchProvider>
          <Toaster position="top-right" />

          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              {/* PUBLIC ROUTES */}
              <Route path="/" element={<AuthGate><HotelLanding /></AuthGate>} />
              <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
              <Route path="/menu/:branchId" element={<RestaurantPublic />} />

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
    </AuthProvider>
  );
}
