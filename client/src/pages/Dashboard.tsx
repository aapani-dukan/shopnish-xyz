import { firebaseSignOut } from "@/lib/firebase";

export default function Dashboard() {
  return (
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <h2>🎉 Logged in!</h2>
      <button onClick={firebaseSignOut} style={{padding:"8px 16px"}}>Sign out</button>
    </div>
  );
}
