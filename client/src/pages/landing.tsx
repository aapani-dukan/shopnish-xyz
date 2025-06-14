import { startGoogleRedirect } from "@/lib/firebase";

export default function Landing() {
  return (
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <h2>Welcome – please login</h2>
      <button onClick={startGoogleRedirect} style={{padding:"8px 16px"}}>Continue with Google</button>
    </div>
  );
}
