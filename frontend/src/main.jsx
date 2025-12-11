import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { AutoLockProvider } from './components/AutoLockProvider';
import { A11yProvider } from './components/A11yProvider';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <A11yProvider>
        <AuthProvider>
          <VaultProvider>
            <AutoLockProvider>
              <App />
            </AutoLockProvider>
          </VaultProvider>
        </AuthProvider>
      </A11yProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// 注册 Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service Worker 注册失败，静默处理
    });
  });
}

// 检测网络状态变化
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
  document.body.classList.add('online');
});

window.addEventListener('offline', () => {
  document.body.classList.remove('online');
  document.body.classList.add('offline');
});
