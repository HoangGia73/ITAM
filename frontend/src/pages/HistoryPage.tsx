import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import api from '../utils/api';
import DownloadPdfButton from '../components/DownloadPdfButton';
import { useAuth } from '../state/AuthContext';
import type { Assignment } from '../types';

const HistoryPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<Assignment['action'] | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exportAction, setExportAction] = useState<Assignment['action'] | ''>('');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [page, setPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Assignment | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Assignment[]>('/assignments');
      setLogs(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không tải được lịch sử cấp/thu');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (log: Assignment) => {
    setSelectedLog(log);
    setShowDeleteModal(true);
    setAdminPassword('');
    setDeleteError(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedLog(null);
    setAdminPassword('');
    setDeleteError(null);
  };

  const deleteLog = async () => {
    if (!selectedLog) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/assignments/${selectedLog.id}`, { data: { password: adminPassword } });
      await load();
      setShowDeleteModal(false);
      setSelectedLog(null);
      setAdminPassword('');
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || 'Không thể xóa bản ghi');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    if (showDeleteModal) {
      passwordInputRef.current?.focus();
    }
  }, [showDeleteModal]);

  const label = (action: 'issue' | 'return') => (action === 'issue' ? 'Cấp phát' : 'Thu hồi');
  const statusLabel = (status: Assignment['status']) => {

    switch (status) {

      case 'PENDING_CONFIRM':

        return 'Chờ xác nhận';

      case 'CONFIRMED':

        return 'Đã xác nhận';

      case 'RETURNED':

        return 'Đã thu hồi';

      case 'CANCELLED':

      case 'FAILED':

        return 'Hủy/Lỗi';

      default:

        return status;

    }

  };

  const statusClass = (status: Assignment['status']) => {
    switch (status) {
      case 'PENDING_CONFIRM':
        return 'bg-warning text-dark';
      case 'CONFIRMED':
        return 'bg-success';
      case 'RETURNED':
        return 'bg-info text-dark';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };


  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesTerm =
        !term ||
        log.employeeName.toLowerCase().includes(term) ||
        log.employeeCode.toLowerCase().includes(term) ||
        log.device?.name?.toLowerCase().includes(term) ||
        log.device?.code?.toLowerCase().includes(term) ||
        (log.notes || '').toLowerCase().includes(term) ||
        (log.department || '').toLowerCase().includes(term) ||
        (log.user?.name || '').toLowerCase().includes(term);

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesDate = !dateFilter || dayjs(log.occurredAt).isSame(dayjs(dateFilter), 'day');
      return matchesTerm && matchesAction && matchesDate;
    });
  }, [actionFilter, dateFilter, logs, search]);

  const stats = useMemo(() => {
    const issued = filtered.filter((log) => log.action === 'issue').length;
    const returned = filtered.filter((log) => log.action === 'return').length;
    const devices = new Set(filtered.map((log) => log.device?.id || log.device?.code || log.id)).size;
    return { issued, returned, devices };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageLogs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openExport = () => {
    setExportAction(actionFilter);
    setExportStart(startDate);
    setExportEnd(endDate);
    setShowExport(true);
  };

  const exportExcel = async () => {
    const params = new URLSearchParams();
    const effectiveAction = exportAction || actionFilter;
    const start = exportStart || startDate;
    const end = exportEnd || endDate;
    if (search.trim()) params.append('search', search.trim());
    if (effectiveAction) params.append('action', effectiveAction);
    if (dateFilter) params.append('date', dateFilter);
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    setExporting(true);
    try {
      const res = await api.get(`/assignments/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `assignments-${start || 'all'}-${end || 'all'}${effectiveAction ? `-${effectiveAction}` : ''}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setShowExport(false);
    } finally {
      setExporting(false);
    }
  };

  const loadRange = async () => {
    const params: any = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Assignment[]>('/assignments', { params });
      setLogs(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không tải được lịch sử');
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async (log: Assignment) => {
    setResendStatus(null);
    setResendingId(log.id);
    try {
      const res = await api.post(`/assignments/${log.id}/resend-email`);
      const expiresAt = res.data?.expiresAt ? dayjs(res.data.expiresAt).format('DD/MM/YYYY HH:mm') : null;
      setResendStatus({
        type: 'success',
        message: `Đã gởi lại email xác nhận đến ${log.employeeEmail}${expiresAt ? ` (hết hạn ${expiresAt})` : ''}.`,
      });
    } catch (e: any) {
      setResendStatus({
        type: 'error',
        message: e?.response?.data?.message || 'Gửi lại email thất bại',
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="container-fluid">
      <div className="card-ghost">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <div className="text-muted small">Lịch sử cấp/thu thiết bị</div>
            <h5 className="mb-0">Lịch sử tài sản</h5>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-light btn-sm" onClick={load} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={openExport} disabled={loading}>
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-lg-4">
            <label className="form-label small text-muted mb-1">Tìm kiếm</label>
            <input
              className="form-control"
              placeholder="Tìm theo thiết bị, mã, nhân viên, ghi chú..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-lg-3">
            <label className="form-label small text-muted mb-1">Hành động</label>
            <select
              className="form-select"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as Assignment['action'] | '');
                setPage(1);
              }}
            >
              <option value="">Tất cả hành động</option>
              <option value="issue">Cấp phát</option>
              <option value="return">Thu hồi</option>
            </select>
          </div>
          <div className="col-lg-2">
            <label className="form-label small text-muted mb-1">Ngày cụ thể</label>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="row g-3 mb-3 align-items-end">
          <div className="col-lg-3">
            <label className="form-label small text-muted mb-1">Từ ngày</label>
            <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="col-lg-3">
            <label className="form-label small text-muted mb-1">Đến ngày</label>
            <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="col-lg-4 d-flex gap-2">
            <button className="btn btn-outline-light flex-fill" onClick={loadRange} disabled={loading || (!startDate && !endDate)}>
              Lọc theo khoảng
            </button>
            <button
              className="btn btn-outline-light flex-fill"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDateFilter('');
                setPage(1);
                load().catch(() => {});
              }}
              disabled={loading}
            >
              Đặt lại lọc
            </button>
          </div>
          <div className="col-lg-2 text-lg-end text-muted small">Đang xem {filtered.length} bản ghi</div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <div className="glass p-3 h-100">
              <div className="text-muted small">Tổng bản ghi</div>
              <div className="d-flex align-items-baseline justify-content-between">
                <div className="h4 mb-0">{filtered.length}</div>
                <span className="badge bg-secondary">
                  Trang {currentPage}/{totalPages}
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass p-3 h-100">
              <div className="text-muted small">Cấp phát</div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="h4 mb-0 text-success">{stats.issued}</div>
                <span className="badge bg-success bg-opacity-25 text-success">Issue</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass p-3 h-100">
              <div className="text-muted small">Thu hồi / Số thiết bị liên quan</div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="h4 mb-0">
                  {stats.returned} <span className="text-muted small">| {stats.devices} thiết bị</span>
                </div>
                <span className="badge bg-warning text-dark">Return</span>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {resendStatus && (
          <div className={`alert py-2 ${resendStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {resendStatus.message}
          </div>
        )}
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle">
                        <thead>
              <tr>
                <th>Hành động</th>
                <th>Trạng thái</th>
                <th>Thiết bị</th>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Thời gian</th>
                <th>Ghi chú</th>
                <th>Lý do thu hồi</th>
                <th>Gửi lại email</th>
                <th>Biên bản</th>
                <th>Thực hiện bởi</th>
                {user?.role === 'ADMIN' && <th className="text-end">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 12 : 11} className="text-center text-muted">

                    Đang tải...

                  </td>

                </tr>
              ) : pageLogs.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 12 : 11} className="text-center text-muted">

                    {search || actionFilter || dateFilter || startDate || endDate ? 'Không tìm thấy bản ghi phù hợp.' : 'Chưa có lịch sử.'}

                  </td>

                </tr>
              ) : (

                pageLogs.map((log) => (

                  <tr key={log.id}>

                    <td>

                      <span className={`badge ${log.action === 'issue' ? 'bg-success' : 'bg-warning text-dark'}`}>{label(log.action)}</span>

                    </td>

                    <td>

                      <span className={`badge ${statusClass(log.status)}`}>{statusLabel(log.status)}</span>

                    </td>

                    <td>

                      <div className="fw-semibold">{log.device?.name}</div>

                      <div className="small text-muted">{log.device?.code}</div>

                    </td>

                    <td>

                      <div className="fw-semibold">{log.employeeName}</div>

                      <div className="small text-muted">{log.employeeCode}</div>

                    </td>

                    <td>{log.department}</td>

                    <td>{dayjs(log.occurredAt).format('DD/MM/YYYY HH:mm')}</td>

                    <td>{log.notes || '-'}</td>

                    <td>{log.action === 'return' ? log.returnReason || '-' : '-'}</td>

                    <td>

                      {log.action === 'issue' && log.status === 'PENDING_CONFIRM' ? (

                        <button className="btn btn-outline-info btn-sm" onClick={() => resendEmail(log)} disabled={resendingId === log.id || loading}>

                          {resendingId === log.id ? 'Đang gởi...' : 'Gửi lại email'}

                        </button>

                      ) : (

                        <span className="text-muted">-</span>

                      )}

                    </td>

                    <td>

                      <DownloadPdfButton assignment={log} size="sm" />

                    </td>

                    <td>{log.user?.name || '-'}</td>
                    {user?.role === 'ADMIN' && (
                      <td className="text-end">
                        <button className="btn btn-outline-danger btn-sm" onClick={() => openDeleteModal(log)}>
                          Xóa
                        </button>
                      </td>
                    )}

                  </tr>

                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div className="text-muted small">
            Trang {currentPage}/{totalPages} - {filtered.length} bản ghi
          </div>
          <div className="btn-group">
            <button className="btn btn-outline-light btn-sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </button>
            <button className="btn btn-outline-light btn-sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Sau
            </button>
          </div>
        </div>
      </div>

      {showExport && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75">
          <div className="glass p-4" style={{ width: '420px' }}>
            <h5 className="mb-3">Bộ lọc xuất Excel</h5>
            <div className="mb-3">
              <label className="form-label small text-muted">Hành động</label>
              <select className="form-select" value={exportAction} onChange={(e) => setExportAction(e.target.value as Assignment['action'] | '')}>
                <option value="">Theo bộ lọc hiện tại ({actionFilter || 'tất cả'})</option>
                <option value="issue">Chỉ cấp phát</option>
                <option value="return">Chỉ thu hồi</option>
              </select>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small text-muted">Từ ngày</label>
                <input type="date" className="form-control" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
              </div>
              <div className="col-6">
                <label className="form-label small text-muted">Đến ngày</label>
                <input type="date" className="form-control" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-muted small mb-3">File sẽ được xuất theo các bộ lọc đang áp dụng (tìm kiếm, ngày cụ thể) cùng với tùy chọn trên.</p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-light" onClick={() => setShowExport(false)} disabled={exporting}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedLog && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75">
          <div className="glass p-4" style={{ width: '420px' }}>
            <h5 className="mb-2">Xóa bản ghi</h5>
            <p className="text-muted small mb-3">Chỉ có admin mới xóa được bản ghi. Nhập mật khẩu admin để xóa bản ghi #{selectedLog.id}.</p>
            <div className="mb-3">
              <label className="form-label small text-muted">Mật khẩu admin</label>
              <input
                type="password"
                className="form-control"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={deleting}
                placeholder="Nhập mật khẩu admin..."
                ref={passwordInputRef}
                autoFocus
              />
            </div>
            {deleteError && <div className="alert alert-danger py-2">{deleteError}</div>}
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-light" onClick={closeDeleteModal} disabled={deleting}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={deleteLog} disabled={deleting || !adminPassword.trim()}>
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HistoryPage;
