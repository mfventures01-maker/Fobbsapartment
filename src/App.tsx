// src/App.tsx - CARSS DIAGNOSTICS PANEL V2
// This creates a live monitoring panel that shows real-time system state
// Use this to verify each restoration phase

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';

// ============================================
// DIAGNOSTICS PANEL COMPONENT
// Live system monitor in bottom-right corner
// ============================================
function DiagnosticsPanel() {
  const { session, user, isLoading, isAuthenticated, role, businessId, branchId } = useAuth();
  const [rpcStatus, setRpcStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [lastRpcResponse, setLastRpcResponse] = useState<any>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Test RPC call when auth is ready
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setRpcStatus('pending');
      setRpcError(null);

      import('./lib/supabaseClient').then(({ supabase }) => {
        // We use the raw supabase client here as a diagnostic test
        supabase.rpc('get_my_identity', { p_terminal_type: 'staff' })
          .then(response => {
            setRpcStatus('success');
            setLastRpcResponse(response);
            console.log('[DIAGNOSTICS] ✅ RPC Test Success:', response);
          })
          .catch(err => {
            setRpcStatus('error');
            setRpcError(err.message);
            console.error('[DIAGNOSTICS] ❌ RPC Test Failed:', err);
          });
      }).catch(err => {
        setRpcStatus('error');
        setRpcError('Supabase client import failed');
        console.error('[DIAGNOSTICS] ❌ Import failed:', err);
      });
    }
  }, [isAuthenticated, isLoading, refreshCount]);

  // Manual refresh button
  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: '#1e1e1e',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '10px',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #00ff00',
      maxWidth: '320px',
      zIndex: 9999,
      backdropFilter: 'blur(5px)',
      boxShadow: '0 0 20px rgba(0,255,0,0.2)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>🔬 CARSS DIAGNOSTICS</span>
        <button
          onClick={handleRefresh}
          style={{ background: 'transparent', border: 'none', color: '#00ff00', cursor: 'pointer', fontSize: '10px' }}
          title="Refresh RPC Test"
        >
          🔄
        </button>
      </div>

      <div>📱 URL: {window.location.pathname}</div>
      <div>🌐 Online: {navigator.onLine ? '✅ Yes' : '❌ No'}</div>
      <div>🕐 Time: {new Date().toLocaleTimeString()}</div>

      <hr style={{ margin: '8px 0', borderColor: '#00ff00' }} />

      <div>🔐 Auth: {
        isLoading ? '⏳ LOADING...' :
          isAuthenticated ? '✅ ACTIVE' :
            '🟡 INACTIVE'
      }</div>

      {user && <div>👤 User: {user.email}</div>}
      {role && <div>🎭 Role: <span style={{ color: '#ffff00' }}>{role}</span></div>}
      {businessId && <div>🏢 Business: {businessId.substring(0, 8)}...</div>}
      {branchId && <div>📍 Branch: {branchId.substring(0, 8)}...</div>}

      <hr style={{ margin: '8px 0', borderColor: '#00ff00' }} />

      <div>📡 RPC Test (get_my_identity):</div>
      <div style={{ marginLeft: '8px' }}>
        Status: {
          rpcStatus === 'pending' ? '⏳ WAITING...' :
            rpcStatus === 'success' ? '✅ SUCCESS' :
              '❌ FAILED'
        }
      </div>

      {rpcError && (
        <div style={{ color: '#ff6666', fontSize: '8px', marginTop: '4px', wordBreak: 'break-all' }}>
          Error: {rpcError.substring(0, 80)}
        </div>
      )}

      {lastRpcResponse && (
        <div style={{ fontSize: '8px', marginTop: '4px', wordBreak: 'break-all' }}>
          Response: {JSON.stringify(lastRpcResponse).substring(0, 80)}...
        </div>
      )}

      <hr style={{ margin: '8px 0', borderColor: '#00ff00' }} />

      <div style={{ fontSize: '8px', color: '#888' }}>
        Session: {session ? '✅ Active' : '❌ None'}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [bootTime] = useState(new Date().toISOString());
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [wrapWithAuth, setWrapWithAuth] = useState(false);
  const [testMessage, setTestMessage] = useState<string>('');

  console.log('[ANTI-GRAVITY] 🚀 App mounting with Diagnostics Panel V2');

  // Test localStorage for session
  useEffect(() => {
    const authKey = Object.keys(localStorage).find(k => k.includes('supabase') || k.includes('carss'));
    if (authKey) {
      try {
        const data = localStorage.getItem(authKey);
        setTestMessage(`Found token: ${authKey} (${data?.length || 0} chars)`);
      } catch (e) {
        setTestMessage('Token found but unreadable');
      }
    } else {
      setTestMessage('No auth token in localStorage');
    }
  }, []);

  // Main content that can optionally be wrapped with AuthProvider
  const MainContent = (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <div style={{
        border: '2px solid #00ff00',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,255,0,0.1)'
      }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>🛸 CARSS IS ALIVE</h1>
        <p>Boot Time: {bootTime}</p>
        <p>Environment: {(import.meta as any).env?.MODE || 'development'}</p>
        <p>Auth Wrapper: {wrapWithAuth ? '✅ ENABLED' : '⏸️ DISABLED'}</p>
        <p>Storage: {testMessage}</p>

        <hr style={{ margin: '20px 0', borderColor: '#00ff00' }} />

        {/* Phase Indicator */}
        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: 'rgba(0,255,0,0.1)', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>📍 CONTROLLED RESURRECTION</h3>
          <p style={{ margin: '5px 0' }}>
            🔹 PHASE 1: AuthProvider -
            <span style={{ color: wrapWithAuth ? '#00ff00' : '#ffff00' }}>
              {wrapWithAuth ? '✅ ACTIVE' : '⏸️ READY TO TEST'}
            </span>
          </p>
          <p style={{ margin: '5px 0' }}>🔹 PHASE 2: ProtectedRoute - <span style={{ color: '#666' }}>WAITING</span></p>
          <p style={{ margin: '5px 0' }}>🔹 PHASE 3: RPC Calls - <span style={{ color: '#666' }}>WAITING</span></p>
          <p style={{ margin: '5px 0' }}>🔹 PHASE 4: SystemState - <span style={{ color: '#666' }}>WAITING</span></p>
        </div>

        {/* Control Buttons */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              console.log('[ANTI-GRAVITY] 🧪 Testing AuthProvider import...');
              import('./contexts/AuthContext').then(module => {
                console.log('[ANTI-GRAVITY] ✅ AuthProvider loaded:', Object.keys(module));
                alert('✅ AuthProvider module loaded!\n\nCheck console for details.');
              }).catch(err => {
                console.error('[ANTI-GRAVITY] ❌ AuthProvider load failed:', err);
                alert('❌ Failed to load AuthProvider: ' + err.message);
              });
            }}
            style={{
              padding: '8px 16px',
              background: '#00ff00',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🧪 Test Auth Load
          </button>

          <button
            onClick={() => {
              setWrapWithAuth(!wrapWithAuth);
              console.log('[ANTI-GRAVITY] 🔄 Auth wrapper toggled:', !wrapWithAuth);
            }}
            style={{
              padding: '8px 16px',
              background: wrapWithAuth ? '#ff6600' : '#00ff00',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {wrapWithAuth ? '🔓 Disable Auth Wrapper' : '🔒 Enable Auth Wrapper'}
          </button>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#00ff00',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showDiagnostics ? '🔍 Hide Diagnostics' : '🔬 Show Diagnostics'}
          </button>
        </div>

        {/* Status Messages */}
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '4px', fontSize: '11px' }}>
          <div>📋 INSTRUCTIONS:</div>
          <ol style={{ marginTop: '5px', paddingLeft: '20px' }}>
            <li>✅ You see this green box → UI pipeline works</li>
            <li>🔬 Diagnostics panel should appear in bottom-right</li>
            <li>🔒 Click "Enable Auth Wrapper" to test auth</li>
            <li>👀 Watch Diagnostics panel for auth status</li>
            <li>📡 RPC test will run automatically when auth is active</li>
          </ol>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Main content - optionally wrapped with AuthProvider */}
      {wrapWithAuth ? (
        <AuthProvider>
          {MainContent}
        </AuthProvider>
      ) : (
        MainContent
      )}

      {/* Diagnostics Panel - always runs with AuthProvider for monitoring */}
      {showDiagnostics && (
        <AuthProvider>
          <DiagnosticsPanel />
        </AuthProvider>
      )}
    </>
  );
}
