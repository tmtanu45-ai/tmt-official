import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import type { User, Profile } from '../types/index';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  display_name: string;
  ff_uid: string;
  in_game_name: string;
  date_of_birth: string;
}



const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    setProfile(data.profile);
  }

  async function register(data: RegisterData) {
    await api.post('/auth/register', data);
    // Registration requires email verification
    // User will be redirected to login after verification
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    const { data } = await api.get('/profile/me');
    setProfile(data);
  }

  async function updateProfile(data: Partial<Profile>) {
    const { data: updated } = await api.patch('/profile/me', data);
    setProfile(updated);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}