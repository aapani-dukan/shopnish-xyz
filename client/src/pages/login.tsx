// src/pages/Login.tsx

import { startGoogleRedirect } from "@/lib/firebase"; // Make sure the path is correct

export default function Login() {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f0f2f5"
    }}>
      <h2 style={{ color: "#333", marginBottom: "20px" }}>Welcome – Please Log In</h2>
      <button
        onClick={startGoogleRedirect}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#4285F4", /* Google Blue */
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#357ae8')}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#4285F4')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.65 12.185c0-.78-.07-1.54-.2-2.28H12v4.54h6.05c-.25 1.25-.87 2.37-1.78 3.23l4.38 3.42c2.5-2.3 3.95-5.6 3.95-9z" />
            <path d="M12 22c3.27 0 6.03-1.08 8.04-2.92l-4.38-3.42c-1.18.78-2.68 1.24-4.66 1.24-3.58 0-6.61-2.42-7.7-5.69H.86v3.52C2.8 19.38 7.03 22 12 22z" />
            <path d="M4.3 13.91c-.2-.6-.3-1.24-.3-1.91s.1-1.31.3-1.91V6.58H.86C.3 7.82 0 9.3 0 10.5c0 1.2.3 2.68.86 3.92L4.3 13.91z" />
            <path d="M12 4.1c2.02 0 3.86.68 5.28 1.83l3.87-3.66C18.03 1.5 15.27.4 12 .4 7.03.4 2.8 3.02.86 6.58l3.44 2.67C5.39 6.52 8.42 4.1 12 4.1z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
