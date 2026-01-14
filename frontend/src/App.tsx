import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import AssignPage from './pages/AssignPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import DeviceQrPage from './pages/DeviceQrPage';
import ConfirmAssignmentPage from './pages/ConfirmAssignmentPage';
import ModulesPage from './pages/ModulesPage';
import Layout from './components/Layout';
import { useAuth } from './state/AuthContext';

const Protected = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/qr/:code" element={<DeviceQrPage />} />
    <Route path="/confirm-assignment" element={<ConfirmAssignmentPage />} />
    <Route
      path="/modules"
      element={
        <Protected>
          <ModulesPage />
        </Protected>
      }
    />
    <Route
      path="/itam/*"
      element={
        <Protected>
          <Layout>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="assignments" element={<AssignPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Routes>
          </Layout>
        </Protected>
      }
    />
    <Route path="/" element={<Navigate to="/modules" replace />} />
    <Route path="*" element={<Navigate to="/modules" replace />} />
  </Routes>
);

export default App;
