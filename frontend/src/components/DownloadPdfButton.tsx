import { useState } from 'react';
import api from '../utils/api';
import type { Assignment } from '../types';

type DownloadPdfButtonProps = {
  assignment: Pick<
    Assignment,
    'id' | 'action' | 'device' | 'documentName' | 'documentUrl'
  >;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
};

const normalizeUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const base = api.defaults.baseURL || '';
  return `${base.replace(/\/api\/?$/, '')}${url}`;
};

const showToast = (message: string) => {
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-bg-danger show position-fixed top-0 end-0 m-3';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
    </div>
  `;
  document.body.appendChild(toast);

  const remove = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 150);
  };

  const closeBtn = toast.querySelector('.btn-close');
  closeBtn?.addEventListener('click', remove);
  setTimeout(remove, 3500);
};

const DownloadPdfButton = ({ assignment, className = '', size = 'sm', disabled }: DownloadPdfButtonProps) => {
  const [downloading, setDownloading] = useState(false);
  const fileName = assignment.documentName || `Bien-ban-${assignment.action}-${assignment.device?.code || 'asset'}.pdf`;

  const canDownload = Boolean(assignment.documentUrl || assignment.id);
  const triggerDownload = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const fetchDocument = async () => {
    if (assignment.documentUrl) {
      return api.get(normalizeUrl(assignment.documentUrl), { responseType: 'blob' });
    }
    return api.get(`/assignments/${assignment.id}/document`, { responseType: 'blob' });
  };

  const handleDownload = async () => {
    if (!canDownload || downloading) return;
    setDownloading(true);

    try {
      const res = await fetchDocument();
      triggerDownload(res.data);
    } catch (firstError) {
      if (assignment.documentUrl) {
        try {
          const res = await api.get(`/assignments/${assignment.id}/document`, { responseType: 'blob' });
          triggerDownload(res.data);
          return;
        } catch {
          // swallow to show toast below
        }
      }
      console.error('Tải biên bản thất bại', firstError);
      showToast('Tải biên bản PDF thất bại, vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  };

  if (!canDownload) return null;

  return (
    <button
      className={`btn btn-outline-light btn-${size} ${className}`.trim()}
      onClick={handleDownload}
      disabled={disabled || downloading}
    >
      {downloading ? <span className="spinner-border spinner-border-sm me-2" role="status" /> : <span className="me-1">⬇</span>}
      {downloading ? 'Đang tải...' : 'Download PDF'}
    </button>
  );
};

export default DownloadPdfButton;
