import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { AutoLockProvider } from './components/AutoLockProvider';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VaultProvider>
          <AutoLockProvider>
            <App />
          </AutoLockProvider>
        </VaultProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
