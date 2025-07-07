// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ✅ Conditionally import and call setupMobileConsole only in development
if (import.meta.env.MODE !== 'production') {
  import('./lib/vconsole').then(({ setupMobileConsole }) => {
    setupMobileConsole();
  }).catch(err => {
    console.error("Error loading vconsole setup:", err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
