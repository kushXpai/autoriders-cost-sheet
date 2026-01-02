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
  // Initialize state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          // Try fetching profile from 'users' table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single<User>();

          // If row exists, use it; if not, fallback to minimal user object
          const currentUser = profile || {
            id: data.session.user.id,
            email: data.session.user.email || '',
            full_name: data.session.user.email || '',
            role: 'STAFF',
          };

          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error('Error fetching session/profile:', err);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single<User>()
          .then(({ data: profile }) => {
            const currentUser = profile || {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.email || '',
              role: 'STAFF',
            };
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
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

  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAuthenticated = !!user;

  // Return loading state so UI can wait before rendering
  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin, isAuthenticated }}>
      {loading ? <div className="text-center py-12">Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};