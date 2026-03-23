// src/App.tsx - SAFE BOOT MODE V2
// This is a temporary minimal test to verify the UI pipeline is working
// Once confirmed, we will gradually restore components

import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function App() {
  const [bootTime, setBootTime] = useState<string>('');
  const [clientStatus, setClientStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setBootTime(new Date().toISOString());
    console.log('[ANTI-GRAVITY] 🚀 App is mounting - Safe Boot Mode');

    // Quick check if React is rendering
    const root = document.getElementById('root');
    if (root) {
      console.log('[ANTI-GRAVITY] ✅ Root element found, content:', root.innerHTML.substring(0, 100));
      setClientStatus('ready');
    } else {
      console.error('[ANTI-GRAVITY] ❌ Root element not found');
      setClientStatus('error');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      fontFamily: 'monospace',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        border: '2px solid #00ff00',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 0 20px rgba(0,255,0,0.2)'
      }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>🛸 CARSS IS ALIVE</h1>
        <p style={{ margin: '5px 0' }}>
          <strong>Boot Time:</strong> {bootTime || 'Loading...'}
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Environment:</strong> {(import.meta as any).env?.MODE || 'development'}
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Client Status:</strong>
          <span style={{
            color: clientStatus === 'ready' ? '#00ff00' : clientStatus === 'error' ? '#ff0000' : '#ffff00',
            marginLeft: '8px'
          }}>
            {clientStatus === 'loading' ? '⏳ LOADING' : clientStatus === 'ready' ? '✅ READY' : '❌ ERROR'}
          </span>
        </p>
        <hr style={{ margin: '20px 0', borderColor: '#00ff00' }} />
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          ✅ If you see this green box, the UI pipeline is working.
          <br />
          ✅ React is rendering correctly.
          <br />
          ✅ The application root is mounted.
        </p>

        {/* Status indicators */}
        <div style={{ marginTop: '20px', fontSize: '0.8rem' }}>
          <div>🟢 REACT: MOUNTED</div>
          <div>🟢 DOM: READY</div>
          <div>🟡 AUTH: PAUSED (will restore next)</div>
        </div>

        {/* Instructions for next steps */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: 'rgba(0,255,0,0.1)',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          <strong>📋 NEXT STEPS:</strong>
          <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Confirm you see this green box ✅</li>
            <li>Check console for "[ANTI-GRAVITY] 🚀 App is mounting"</li>
            <li>If visible, UI pipeline is confirmed working</li>
            <li>We will now gradually restore AuthProvider and routes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
