import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BellFill, BoxArrowRight } from 'react-bootstrap-icons';
import { useAuth } from '../state/AuthContext';
import type { Device } from '../types';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, alerts, alertsLoading, alertsError, refreshAlerts } = useAuth();
  const [showAlerts, setShowAlerts] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('dismissedAlerts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    refreshAlerts().catch(() => {});
  }, [location.pathname]);

  const renderAlertList = (items: Device[], label: string) => (
    <>
      <div className="fw-bold text-uppercase small mb-1">{label}</div>
      {items.length === 0 && <div className="text-muted small">Không có</div>}
      {items.map((d) => (
        <div key={d.id} className="alert-item">
          <div className="fw-semibold">{d.name}</div>
          <div className="small text-muted">{d.code}</div>
        </div>
      ))}
    </>
  );

  const filteredAlerts = alerts
    ? {
        warranty: (alerts.warranty || []).filter((d) => !dismissedAlertIds.includes(d.id)),
        maintenance: (alerts.maintenance || []).filter((d) => !dismissedAlertIds.includes(d.id)),
      }
    : { warranty: [], maintenance: [] };
  const activeAlertCount = (filteredAlerts.warranty?.length || 0) + (filteredAlerts.maintenance?.length || 0);

  const dismissAlert = (id: number) => {
    setDismissedAlertIds((prev) => {
      const next = Array.from(new Set([...prev, id]));
      localStorage.setItem('dismissedAlerts', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="app-header d-flex align-items-center justify-content-between px-4 py-2 shadow-sm bg-white">
        <div className="d-flex align-items-center gap-3">
          <div className="brand" role="button" onClick={() => navigate('/itam')}>
            ITAM
          </div>
          <nav className="d-none d-md-flex align-items-center gap-3">
            <Link to="/modules" className={location.pathname === '/modules' ? 'active' : ''}>
              Modules
            </Link>
            <Link to="/itam" className={location.pathname === '/itam' ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/itam/devices" className={location.pathname.startsWith('/itam/devices') ? 'active' : ''}>
              Thiết bị
            </Link>
            <Link to="/itam/assignments" className={location.pathname.startsWith('/itam/assignments') ? 'active' : ''}>
              Cấp/Thu
            </Link>
            <Link to="/itam/history" className={location.pathname.startsWith('/itam/history') ? 'active' : ''}>
              Lịch sử
            </Link>
            {user?.role === 'ADMIN' && (
              <Link to="/itam/admin" className={location.pathname.startsWith('/itam/admin') ? 'active' : ''}>
                Quản trị
              </Link>
            )}
          </nav>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            <button className="btn btn-light position-relative" onClick={() => setShowAlerts((v) => !v)}>
              <BellFill />
              {activeAlertCount ? <span className="badge bg-danger position-absolute top-0 start-100 translate-middle">{activeAlertCount}</span> : null}
            </button>
            {showAlerts && (
              <div className="alert-dropdown shadow">
                {alertsLoading ? (
                  <div className="text-muted small">Đang tải...</div>
                ) : alertsError ? (
                  <div className="text-danger small">{alertsError}</div>
                ) : alerts ? (
                  <>
                    {renderAlertList(filteredAlerts.warranty || [], 'Quá hạn bảo hành')}
                    <hr />
                    {renderAlertList(filteredAlerts.maintenance || [], 'Tới hạn bảo trì')}
                  </>
                ) : (
                  <div className="text-muted small">Không có dữ liệu cảnh báo.</div>
                )}
              </div>
            )}
          </div>
          <div className="d-none d-sm-block">
            <div className="small text-muted">Xin chào</div>
            <div className="fw-semibold">{user?.name}</div>
          </div>
          <button className="btn btn-outline-secondary" onClick={() => logout()}>
            <BoxArrowRight className="me-1" />
            Thoát
          </button>
        </div>
      </header>
      <main className="app-body">
        {activeAlertCount > 0 && (
          <div className="alert alert-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
            <div>
              <strong>Cảnh báo bảo trì/bảo hành:</strong>{' '}
              {[...(filteredAlerts.warranty || []), ...(filteredAlerts.maintenance || [])].map((d) => d.name).join(', ')}
            </div>
            <div className="d-flex flex-wrap gap-1">
              {[...(filteredAlerts.warranty || []), ...(filteredAlerts.maintenance || [])].map((d) => (
                <button key={d.id} className="btn btn-sm btn-outline-dark" onClick={() => dismissAlert(d.id)}>
                  Đã xử lý {d.code}
                </button>
              ))}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;
