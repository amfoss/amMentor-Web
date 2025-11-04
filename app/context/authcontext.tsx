'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'Mentor' | 'Mentee' | null;

interface AuthContextType {
  userRole: UserRole;
  isLoggedIn: boolean;
  isInitialized: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userRole: null,
  isLoggedIn: false,
  isInitialized: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRole | null;
    const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';

    // Validate consistency: if loggedIn but no role, or role exists but not loggedIn, clear to avoid bad state
    if (loggedInStatus && !storedRole) {
      // Clear inconsistent isLoggedIn flag
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('email');
      localStorage.removeItem('name');
      sessionStorage.removeItem('cache_profile');
      sessionStorage.removeItem('currentTrack');
      setUserRole(null);
      setIsLoggedIn(false);
    } else if (storedRole && !loggedInStatus) {
      // Has role but not marked as logged in - keep the role and mark as logged in
      // This can happen if isLoggedIn was cleared but userRole wasn't
      setUserRole(storedRole);
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
    } else if (storedRole && loggedInStatus) {
      setUserRole(storedRole);
      setIsLoggedIn(true);
    }

    setIsInitialized(true);
  }, []);

  const login = (role: UserRole) => {
    setUserRole(role);
    setIsLoggedIn(true);
    localStorage.setItem('userRole', role as string);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const logout = () => {
    setUserRole(null);
    setIsLoggedIn(false);
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
  };

  return (
    <AuthContext.Provider value={{ userRole, isLoggedIn, isInitialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);