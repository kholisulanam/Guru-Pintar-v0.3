import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './context/ToastContext.tsx';

// Register PWA Service Worker
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('GuruPintar Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.log('Service Worker registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev mode if needed for testing PWA install
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
