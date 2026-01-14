import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import type { AlertSummary, ModuleInfo, User } from '../types';

type AuthState = {
  token: string | null;
  user: User | null;
  modules: ModuleInfo[] | null;
  alerts: AlertSummary | null;
  alertsLoading: boolean;
  alertsError: string | null;
  modulesLoading: boolean;
  modulesError: string | null;
  login: (email: string, password: string) => Promise<AlertSummary | null>;
  logout: () => void;
  refreshAlerts: () => Promise<void>;
  loadModules: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  modules: null,
  alerts: null,
  alertsLoading: false,
  alertsError: null,
  modulesLoading: false,
  modulesError: null,
  login: async () => null,
  logout: () => {},
  refreshAlerts: async () => {},
  loadModules: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
  const [modules, setModules] = useState<ModuleInfo[] | null>(
    localStorage.getItem('modules') ? JSON.parse(localStorage.getItem('modules')!) : null,
  );
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  const loadModules = async () => {
    setModulesLoading(true);
    setModulesError(null);
    try {
      const res = await api.get('/modules');
      setModules(res.data.modules || []);
      localStorage.setItem('modules', JSON.stringify(res.data.modules || []));
    } catch (e: any) {
      setModulesError(e?.response?.data?.message || 'Failed to load modules');
    } finally {
      setModulesLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  useEffect(() => {
    if (token && !modules) {
      loadModules().catch(() => {});
    }
  }, [token, modules]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u, alerts: a, modules: m } = res.data;
    setToken(t);
    setUser(u);
    setAlerts(a);
    setModules(m || []);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('modules', JSON.stringify(m || []));
    return a;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAlerts(null);
    setModules(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('modules');
  };

  const refreshAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await api.get('/devices/issues/alerts');
      setAlerts(res.data);
    } catch (e: any) {
      setAlertsError(e?.response?.data?.message || 'Không tải được cảnh báo');
    } finally {
      setAlertsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        modules,
        alerts,
        alertsLoading,
        alertsError,
        modulesLoading,
        modulesError,
        login,
        logout,
        refreshAlerts,
        loadModules,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
