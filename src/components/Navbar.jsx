import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/appwrite";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-100">
      <Link to="/" className="font-bold text-xl">Blog App</Link>
      <div className="space-x-4">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={handleLogout} className="text-red-500">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
