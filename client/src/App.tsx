// client/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Home() {
  return <h2>🏠 Welcome to Shopnish!</h2>;
}

function About() {
  return <h2>ℹ️ This is a demo eCommerce app built with React + Vite.</h2>;
}

function NotFound() {
  return <h2>🚫 404 - Page Not Found</h2>;
}

function App() {
  return (
    <Router>
      <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
        <nav style={{ marginBottom: "1rem" }}>
          <Link to="/" style={{ marginRight: "1rem" }}>Home</Link>
          <Link to="/about">About</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
