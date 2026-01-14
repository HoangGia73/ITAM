import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../utils/api';
import type { AlertSummary, Assignment, Stats } from '../types';

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({ total: 0, assigned: 0, available: 0 });
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week');
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setStatsLoading(true);
    setAlertsLoading(true);
    setStatsError(null);
    setAlertsError(null);
    try {
      const [statRes, alertRes] = await Promise.all([api.get('/devices/metrics/counts'), api.get('/devices/issues/alerts')]);
      setStats(statRes.data);
      setAlerts(alertRes.data);
    } catch (e: any) {
      setStatsError(e?.response?.data?.message || 'Không tải được thống kê');
      setAlertsError(e?.response?.data?.message || 'Không tải được cảnh báo');
    } finally {
      setStatsLoading(false);
      setAlertsLoading(false);
    }
  };

  const loadRecent = async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await api.get<Assignment[]>('/assignments');
      setRecentAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setRecentError(e?.response?.data?.message || 'Không tải được hoạt động gần đây');
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    loadRecent().catch(() => {});
  }, []);

  const exportReport = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/export', {
        params: { range },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itam-${range}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
      setShowExport(false);
    }
  };

  const chartData = [
    { name: 'Tổng', value: stats.total, fill: '#38bdf8' },
    { name: 'Đã cấp', value: stats.assigned, fill: '#22c55e' },
    { name: 'Còn trống', value: stats.available, fill: '#f59e0b' },
  ];
  const recentWindowStart = dayjs().subtract(7, 'day');
  const assignmentsLast7Days = recentAssignments.filter((item) => dayjs(item.occurredAt).isAfter(recentWindowStart));
  const issuedLast7Days = assignmentsLast7Days.filter((item) => item.action === 'issue').length;
  const returnedLast7Days = assignmentsLast7Days.filter((item) => item.action === 'return').length;
  const pendingConfirm = recentAssignments.filter((item) => item.status === 'PENDING_CONFIRM').length;

  return (
    <div className="container-fluid">
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card-ghost">
            <div className="text-muted small">Tổng thiết bị</div>
            <div className="display-6 fw-bold text-info">{statsLoading ? '...' : stats.total}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-ghost">
            <div className="text-muted small">Đã cấp</div>
            <div className="display-6 fw-bold text-success">{statsLoading ? '...' : stats.assigned}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card-ghost">
            <div className="text-muted small">Còn trống</div>
            <div className="display-6 fw-bold text-warning">{statsLoading ? '...' : stats.available}</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-3">
        <div className="col-lg-8">
          <div className="card-ghost h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Thống kê</h5>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => setShowExport(true)}>
                  Xuất báo cáo
                </button>
              </div>
            </div>
            <div style={{ height: 280 }}>
              {statsLoading ? (
                <div className="d-flex h-100 align-items-center justify-content-center text-muted">Đang tải biểu đồ...</div>
              ) : statsError ? (
                <div className="text-danger">{statsError}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card-ghost h-100">
            <h5 className="mb-3">Cảnh báo</h5>
            {alertsLoading ? (
              <div className="text-muted">Đang tải cảnh báo...</div>
            ) : alertsError ? (
              <div className="text-danger">{alertsError}</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                <div className="p-3 glass">
                  <div className="d-flex justify-content-between">
                    <span>Quá hạn bảo hành</span>
                    <span className="badge bg-danger">{alerts?.warranty?.length || 0}</span>
                  </div>
                </div>
                <div className="p-3 glass">
                  <div className="d-flex justify-content-between">
                    <span>Tới hạn bảo trì</span>
                    <span className="badge bg-warning text-dark">{alerts?.maintenance?.length || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4 mt-3">
        <div className="col-lg-8">
          <div className="card-ghost h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Hoạt động gần đây</h5>
              <Link className="btn btn-sm btn-outline-light" to="/itam/history">
                Xem tất cả
              </Link>
            </div>
            {recentLoading ? (
              <div className="text-muted">Đang tải hoạt động...</div>
            ) : recentError ? (
              <div className="text-danger">{recentError}</div>
            ) : recentAssignments.length === 0 ? (
              <div className="text-muted">Chưa có hoạt động mới.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Hành động</th>
                      <th>Thiết bị</th>
                      <th>Nhân viên</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignments.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`badge ${item.action === 'issue' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {item.action === 'issue' ? 'Cấp phát' : 'Thu hồi'}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.device?.name || '-'}</div>
                          <div className="small text-muted">{item.device?.code || '-'}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.employeeName}</div>
                          <div className="small text-muted">{item.employeeCode}</div>
                        </td>
                        <td>{item.occurredAt ? dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card-ghost h-100">
            <h5 className="mb-3">Tóm tắt tuần</h5>
            {recentLoading ? (
              <div className="text-muted">Đang tải thống kê...</div>
            ) : recentError ? (
              <div className="text-danger">{recentError}</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                <div className="glass p-3">
                  <div className="text-muted small">Cấp phát trong 7 ngày</div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="h4 mb-0 text-success">{issuedLast7Days}</div>
                    <span className="badge bg-success bg-opacity-25 text-success">Issue</span>
                  </div>
                </div>
                <div className="glass p-3">
                  <div className="text-muted small">Thu hồi trong 7 ngày</div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="h4 mb-0 text-warning">{returnedLast7Days}</div>
                    <span className="badge bg-warning text-dark">Return</span>
                  </div>
                </div>
                <div className="glass p-3">
                  <div className="text-muted small">Chờ xác nhận</div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="h4 mb-0 text-info">{pendingConfirm}</div>
                    <span className="badge bg-info text-dark">Pending</span>
                  </div>
                </div>
                <Link className="btn btn-outline-light btn-sm" to="/itam/history">
                  Xem chi tiết lịch sử
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExport && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75">
          <div className="glass p-4" style={{ width: '360px' }}>
            <h5 className="mb-3">Chọn thời gian</h5>
            <div className="d-flex gap-2">
              {(['day', 'week', 'month'] as const).map((opt) => (
                <button key={opt} className={`btn flex-fill ${range === opt ? 'btn-primary' : 'btn-outline-light'}`} onClick={() => setRange(opt)}>
                  {opt === 'day' ? 'Ngày' : opt === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
            <div className="mt-3 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-light" onClick={() => setShowExport(false)} disabled={downloading}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={exportReport} disabled={downloading}>
                {downloading ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
