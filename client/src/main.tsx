// src/main.tsx या main.jsx
import { setupMobileConsole } from "@/lib/vconsole";
setupMobileConsole(); // ✅ बस यही जोड़ना है

// बाकी React code नीचे वैसा ही रहने दो
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
