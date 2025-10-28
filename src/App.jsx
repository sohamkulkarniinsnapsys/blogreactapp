import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Post from "./pages/Post";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import { getCurrentUser } from "./services/appwrite";
import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    return children;
  };

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
