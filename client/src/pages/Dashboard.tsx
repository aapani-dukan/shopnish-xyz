// src/pages/Dashboard.tsx

import { firebaseSignOut } from "@/lib/firebase"; // Make sure the path is correct

export default function Dashboard() {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#e7f4e4"
    }}>
      <h2 style={{ color: "#28a745", marginBottom: "20px" }}>🎉 You're Logged In!</h2>
      <button
        onClick={firebaseSignOut}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#dc3545", /* Red for Sign Out */
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#c82333')}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#dc3545')}
      >
        Sign Out
      </button>
    </div>
  );
}

