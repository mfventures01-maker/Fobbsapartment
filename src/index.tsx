import './lib/supabaseClient';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { CartProvider } from './contexts/CartContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ShiftProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ShiftProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
