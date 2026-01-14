import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'already' | 'resent';

const ConfirmAssignmentPage = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);
  const calledRef = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('Dang xu ly xac nhan...');
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Thieu token xac nhan.');
      setCanResend(false);
      return;
    }

    if (calledRef.current) return; // avoid double call in dev StrictMode
    calledRef.current = true;

    const confirm = async () => {
      setStatus('loading');
      setMessage('Dang xac nhan, vui long cho...');
      setCanResend(false);
      try {
        const res = await api.get('/assignments/confirm', { params: { token } });
        const data = res.data;
        if (data.alreadyConfirmed) {
          setStatus('already');
          setMessage('Phieu nay da duoc xac nhan truoc do.');
          return;
        }
        setStatus('success');
        setMessage(`Xac nhan thanh cong cho thiet bi ${data.deviceCode || ''}`.trim());
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Xac nhan that bai. Vui long thu lai hoac lien he IT.';
        const expired = err?.response?.data?.code === 'TOKEN_EXPIRED';
        setStatus('error');
        setMessage(msg);
        setCanResend(expired);
      }
    };

    confirm();
  }, [token]);

  const resend = async () => {
    if (!token) return;
    setStatus('loading');
    setMessage('Dang gui lai email xac nhan...');
    try {
      await api.post('/assignments/confirm-resend', { token });
      setStatus('resent');
      setMessage('Da gui lai email xac nhan. Vui long kiem tra hop thu.');
      setCanResend(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gui lai email that bai. Vui long thu lai sau.';
      setStatus('error');
      setMessage(msg);
    }
  };

  const color =
    status === 'success' || status === 'already' || status === 'resent'
      ? '#16a34a'
      : status === 'loading'
      ? '#0ea5e9'
      : '#ef4444';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color }}>Xac nhan cap phat</div>
        <div style={{ lineHeight: 1.6 }}>{message}</div>
        {status === 'loading' && <div style={{ marginTop: 12, color: '#94a3b8' }}>Vui long khong dong trang...</div>}
        {status === 'success' && <div style={{ marginTop: 12, color: '#16a34a' }}>Ban co the dong trang nay.</div>}
        {status === 'resent' && <div style={{ marginTop: 12, color: '#16a34a' }}>Ban co the dong trang nay.</div>}
        {status === 'error' && canResend && (
          <button
            type="button"
            onClick={resend}
            style={{
              marginTop: 16,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Gui lai email xac nhan
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfirmAssignmentPage;
