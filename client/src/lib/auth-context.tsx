import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { UserRole, Student, Driver } from '@shared/schema';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  student: Student | null;
  driver: Driver | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchUserProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError.message);
        return null;
      }

      if (!userData) {
        console.log('User profile not found in database');
        return null;
      }

      const authUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role as UserRole,
      };

      if (userData.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .single();
        setStudent(studentData || null);
        setDriver(null);
      } else if (userData.role === 'driver') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .single();
        setDriver(driverData || null);
        setStudent(null);
      } else {
        setStudent(null);
        setDriver(null);
      }

      return authUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const handleAuthChange = useCallback(async (event: AuthChangeEvent, newSession: Session | null) => {
    console.log('Auth event:', event);
    
    setSession(newSession);
    
    if (newSession?.user) {
      const authUser = await fetchUserProfile(newSession.user.id);
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
        setStudent(null);
        setDriver(null);
      }
    } else {
      setUser(null);
      setStudent(null);
      setDriver(null);
    }
    
    setLoading(false);
  }, [fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      const authUser = await fetchUserProfile(session.user.id);
      setUser(authUser);
    }
  }, [session?.user?.id, fetchUserProfile]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (currentSession?.user) {
          setSession(currentSession);
          const authUser = await fetchUserProfile(currentSession.user.id);
          if (isMounted) {
            setUser(authUser);
            setLoading(false);
          }
        } else {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      handleAuthChange(event, newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, handleAuthChange]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStudent(null);
    setDriver(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      student,
      driver,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
