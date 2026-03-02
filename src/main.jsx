import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';

// Safely register PWA Service Worker
try {
  import('virtual:pwa-register').catch(() => { });
} catch {
  console.warn('PWA plugin missing, skipping registration');
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

function ErrorFallback({ error }) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', color: '#EF4444', textAlign: 'center' }}>
      <h2>Something went wrong.</h2>
      <p style={{ fontSize: 14, color: '#999', margin: '12px 0' }}>
        {error?.message || 'Unknown error'}
      </p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: 16 }}>Reload</button>
    </div>
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
