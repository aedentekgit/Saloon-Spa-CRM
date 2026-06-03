import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { notifyDataChanged } from './utils/realtimeSync';

// Global fetch interceptor to handle session invalidation / 401s instantly
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const [input, init] = args;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const url = input instanceof Request ? input.url : String(input);
  if (response.ok && !['GET', 'HEAD', 'OPTIONS'].includes(method) && url.includes('/api/')) {
    notifyDataChanged({ method, url });
  }
  if (response.status === 401) {
    const authKeys = ['zen_spa_user', 'zen_spa_user_staging'];
    const hasSavedUser = authKeys.some((key) => localStorage.getItem(key));
    if (hasSavedUser) {
      console.warn('Session expired or another login detected. Logging out.');
      authKeys.forEach((key) => localStorage.removeItem(key));
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('zen_')) {
          localStorage.removeItem(key);
        }
      });
      window.location.href = '/login';
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
