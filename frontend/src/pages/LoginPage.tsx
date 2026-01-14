import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const LoginPage = () => {
  const { login, alerts } = useAuth();
  const [email, setEmail] = useState('admin@itam.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const alertResult = await login(email, password);
      navigate('/modules');
      if (alertResult && alertResult.total > 0) {
        setShowPopup(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="glass p-4" style={{ width: '420px' }}>
        <h3 className="mb-3 text-center text-info">Đăng nhập ITAM</h3>
        <p className="text-secondary text-center">ADMIN / IT_STAFF</p>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Mật khẩu</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button className="btn btn-primary w-100" type="submit">
            Đăng nhập
          </button>
        </form>
      </div>

      {showPopup && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50">
          <div className="glass p-4" style={{ width: '360px' }}>
            <h5 className="text-warning">Nhắc nhở</h5>
            <p className="mb-1">Có {alerts?.total} thiết bị cần chú ý.</p>
            <button className="btn btn-light me-2" onClick={() => setShowPopup(false)}>
              Đóng
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowPopup(false);
                navigate('/itam/devices');
              }}
            >
              Xem ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
