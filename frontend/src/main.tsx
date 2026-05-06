import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to handle session invalidation / 401s instantly
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const savedUser = localStorage.getItem('zen_spa_user');
    if (savedUser) {
      console.warn('Session expired or another login detected. Logging out.');
      localStorage.removeItem('zen_spa_user');
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
