import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import type { ModuleInfo } from '../types';

const ModulesPage = () => {
  const { user, modules, modulesLoading, modulesError, loadModules, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!modules) {
      loadModules().catch(() => {});
    }
  }, [modules]);

  const handleOpenModule = (module: ModuleInfo) => {
    if (module.status === 'enabled') {
      navigate(module.route);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="mb-1">Modules</h2>
          <div className="text-secondary small">Signed in as {user?.name || 'User'}</div>
        </div>
        <button className="btn btn-outline-light" onClick={logout}>
          Logout
        </button>
      </div>

      {modulesLoading && <div className="text-secondary">Loading modules...</div>}
      {modulesError && <div className="alert alert-danger py-2">{modulesError}</div>}

      <div className="row g-3">
        {(modules || []).map((module) => (
          <div key={module.id} className="col-12 col-md-6 col-lg-4">
            <div
              className={`card-ghost module-card ${module.status === 'disabled' ? 'module-disabled' : ''}`}
              role="button"
              onClick={() => handleOpenModule(module)}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="fw-semibold">{module.name}</div>
                <span className={`badge badge-pill ${module.status === 'enabled' ? 'bg-success' : 'bg-secondary'}`}>
                  {module.status === 'enabled' ? 'Available' : 'Coming soon'}
                </span>
              </div>
              <div className="text-secondary small mt-2">{module.description || 'Module'}</div>
              <div className="small mt-3">
                {module.status === 'enabled' ? 'Open module' : 'Not available yet'}
              </div>
            </div>
          </div>
        ))}
        {!modulesLoading && (modules || []).length === 0 && (
          <div className="text-secondary">No modules available for this account.</div>
        )}
      </div>
    </div>
  );
};

export default ModulesPage;
