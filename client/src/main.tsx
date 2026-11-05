import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Splash } from './components/Splash';
import './index.css';
import { applyTheme } from './lib/theme';
import Login from './pages/Login';
import { AppProvider } from './state/AppContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ToastProvider } from './state/Toast';

function Gate() {
  const { status, user } = useAuth();
  // Keep the last theme for the login screen.
  useEffect(() => {
    if (status === 'anon') applyTheme((localStorage.getItem('fitstack:theme') as 'dark' | 'light') ?? 'dark', localStorage.getItem('fitstack:accent') ?? '#FF6B00');
  }, [status]);
  if (status === 'loading') return <Splash />;
  if (status === 'anon' || !user) return <Login />;
  return (
    <AppProvider key={user.id}>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
