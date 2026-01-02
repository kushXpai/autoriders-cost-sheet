import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/supabase/client';
import type { User } from '@/types';
import { signIn as supabaseSignIn, signOut as supabaseSignOut } from '@/supabase/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Load user from localStorage on first render
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Fetch Supabase session & user profile
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          // Try fetching profile from 'users' table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single<User>();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error.message);
          }

          // If profile exists, use it; else fallback to Supabase user object
          const userProfile = profile || {
            id: data.session.user.id,
            email: data.session.user.email || '',
            role: 'USER',
          };

          setUser(userProfile);
          localStorage.setItem('user', JSON.stringify(userProfile));
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
      }
    };

    fetchSession();

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single<User>()
          .then(({ data: profile, error }) => {
            const userProfile = profile || {
              id: session.user.id,
              email: session.user.email || '',
              role: 'USER',
            };

            setUser(userProfile);
            localStorage.setItem('user', JSON.stringify(userProfile));

            if (error && error.code !== 'PGRST116') {
              console.error('Error fetching profile on auth change:', error.message);
            }
          });
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const profile = await supabaseSignIn(email, password);
      if (profile) {
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      }
      return !!profile;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  // Role helpers
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
