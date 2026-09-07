import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  signUp: (email: string, password: string, name: string, gameId: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  refreshAdminSession: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  refreshAdminSession: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('bm_is_admin') === 'true';
  });
  const [loading, setLoading] = useState(true);

  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      if (error) {
        console.warn('RPC has_role error, preserving cached status:', error);
        const cached = localStorage.getItem(`bm_admin_${userId}`) === 'true';
        setIsAdmin(cached);
        return cached;
      }

      const adminStatus = data === true;
      setIsAdmin(adminStatus);
      localStorage.setItem(`bm_admin_${userId}`, adminStatus ? 'true' : 'false');
      localStorage.setItem('bm_is_admin', adminStatus ? 'true' : 'false');
      return adminStatus;
    } catch (err) {
      console.warn('Failed to check admin status:', err);
      const cached = localStorage.getItem(`bm_admin_${userId}`) === 'true';
      setIsAdmin(cached);
      return cached;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_OUT') {
          const wasAdmin = localStorage.getItem('bm_is_admin') === 'true';
          const isManual = localStorage.getItem('bm_manual_logout') === 'true';

          // If auto-logged out without clicking "Logout", attempt to recover session for admin
          if (wasAdmin && !isManual) {
            console.warn('Spontaneous sign-out detected for admin. Recovering active session...');
            const { data: recovered, error: recErr } = await supabase.auth.refreshSession();
            if (!recErr && recovered?.session) {
              setSession(recovered.session);
              setUser(recovered.session.user);
              setIsAdmin(true);
              setLoading(false);
              return;
            }
          }

          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        if (currentSession?.user) {
          checkIsAdmin(currentSession.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        checkIsAdmin(initialSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Proactive Session Keep-Alive Heartbeat & Focus Restoration for Admins
  useEffect(() => {
    if (!user || !isAdmin) return;

    // Heartbeat every 2.5 minutes (150,000ms) to ensure token never expires
    const HEARTBEAT_INTERVAL_MS = 150000;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const activeSession = data?.session;
        if (activeSession) {
          const expiresAt = activeSession.expires_at ?? 0;
          const now = Math.floor(Date.now() / 1000);
          // If token expires in less than 20 minutes (1200 seconds), refresh proactively
          if (expiresAt - now < 1200) {
            const { data: refreshed, error } = await supabase.auth.refreshSession();
            if (!error && refreshed?.session) {
              setSession(refreshed.session);
              setUser(refreshed.session.user);
            }
          }
        } else {
          const isManual = localStorage.getItem('bm_manual_logout') === 'true';
          if (!isManual) {
            const { data: recovered } = await supabase.auth.refreshSession();
            if (recovered?.session) {
              setSession(recovered.session);
              setUser(recovered.session.user);
            }
          }
        }
      } catch (e) {
        console.warn('Admin heartbeat warning:', e);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Refresh session proactively on tab visibility change or window focus
    const handleFocusOrVisible = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          if (activeSession) {
            setSession(activeSession);
            setUser(activeSession.user);
            const expiresAt = activeSession.expires_at ?? 0;
            const now = Math.floor(Date.now() / 1000);
            if (expiresAt - now < 1200) {
              const { data: refreshed } = await supabase.auth.refreshSession();
              if (refreshed?.session) {
                setSession(refreshed.session);
                setUser(refreshed.session.user);
              }
            }
          } else {
            const isManual = localStorage.getItem('bm_manual_logout') === 'true';
            if (!isManual) {
              const { data: recovered } = await supabase.auth.refreshSession();
              if (recovered?.session) {
                setSession(recovered.session);
                setUser(recovered.session.user);
              }
            }
          }
        } catch (e) {
          console.warn('Focus session refresh warning:', e);
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user, isAdmin]);

  const signUp = async (email: string, password: string, name: string, gameId: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          game_id: gameId,
        }
      }
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      localStorage.setItem('bm_manual_logout', 'true');
      if (user?.id) {
        localStorage.removeItem(`bm_admin_${user.id}`);
      }
      localStorage.removeItem('bm_is_admin');
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
    } finally {
      setTimeout(() => {
        localStorage.removeItem('bm_manual_logout');
      }, 1000);
    }
  };

  const refreshAdminSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      console.warn('Manual admin session refresh failed:', err);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  };

  const value = {
    user,
    session,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    refreshAdminSession,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};