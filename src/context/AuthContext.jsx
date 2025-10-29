import React, { createContext, useEffect, useState } from "react";
import { getCurrentUser, logout as appwriteLogout } from "../services/appwrite";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (mounted) setUser(u);
      setChecking(false);
    })();
    return () => (mounted = false);
  }, []);

  const logout = async () => {
    try {
      await appwriteLogout();
      setUser(null);
    } catch (err) {
      console.error("AuthProvider logout error:", err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, checking, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
