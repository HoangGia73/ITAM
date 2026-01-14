import { type FormEvent, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import api from '../utils/api';
import DownloadPdfButton from '../components/DownloadPdfButton';
import type { ActiveAssignee, Assignment, Device } from '../types';

type SelectDevice = Pick<Device, 'id' | 'name' | 'code' | 'status'>;
type AssignedItem = {
  deviceName: string;
  deviceCode: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  status: string;
};

const AssignPage = () => {
  const [action, setAction] = useState<'issue' | 'return'>('issue');
  const [devices, setDevices] = useState<SelectDevice[]>([]);
  const [assignees, setAssignees] = useState<ActiveAssignee[]>([]);
  const [assignedList, setAssignedList] = useState<AssignedItem[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<Assignment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedStatus, setAssignedStatus] = useState('');
  const [assignedPage, setAssignedPage] = useState(1);
  const assignedPageSize = 10;
  const [form, setForm] = useState({
    employeeName: '',
    employeeCode: '',
    department: '',
    employeeEmail: '',
    deviceId: '',
    notes: '',
    returnReason: '',
  });
  const [message, setMessage] = useState('');

  const isReturn = action === 'return';
  const statusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Đã cấp';
      case 'available':
        return 'Còn trống';
      case 'maintenance':
        return 'Bảo trì';
      case 'retired':
        return 'Ngưng dùng';
      default:
        return status;
    }
  };

  const assignmentStatus = (status: Assignment['status']) => {
    switch (status) {
      case 'PENDING_CONFIRM':
        return { label: 'Chờ xác nhận', className: 'bg-warning text-dark' };
      case 'CONFIRMED':
        return { label: 'Đã xác nhận', className: 'bg-success' };
      case 'RETURNED':
        return { label: 'Đã thu hồi', className: 'bg-info text-dark' };
      case 'CANCELLED':
      case 'FAILED':
        return { label: 'Hủy/Lỗi', className: 'bg-danger' };
      default:
        return { label: status, className: 'bg-secondary' };
    }
  };

  const loadData = async (act: 'issue' | 'return') => {
    setListLoading(true);
    setListError(null);
    setPendingError(null);
    if (act === 'issue') {
      setAssignedLoading(true);
      setPendingLoading(true);
      try {
        const [deviceRes, activeRes, pendingRes] = await Promise.all([
          api.get('/devices', { params: { status: 'available' } }),
          api.get<ActiveAssignee[]>('/assignments/active'),
          api.get<Assignment[]>('/assignments', { params: { status: 'PENDING_CONFIRM' } }),
        ]);
        setDevices(deviceRes.data);
        setAssignees([]);
        const rows: AssignedItem[] = activeRes.data.flatMap((a) =>
          (a.devices || []).map((d) => ({
            deviceName: d.name,
            deviceCode: d.code,
            employeeName: a.employeeName,
            employeeCode: a.employeeCode,
            department: a.department,
            status: d.status,
          })),
        );
        setAssignedList(rows);
        const pending = (pendingRes.data || []).filter((item) => item.status === 'PENDING_CONFIRM');
        setPendingConfirm(pending);
      } catch {
        setAssignedList([]);
        setPendingConfirm([]);
        setListError('Không tải được dữ liệu');
        setPendingError('Không tải được danh sách chờ xác nhận');
      } finally {
        setAssignedLoading(false);
        setPendingLoading(false);
        setListLoading(false);
      }
    } else {
      try {
        const res = await api.get('/assignments/active');
        setAssignees(res.data);
        setDevices([]);
        setAssignedList([]);
        setPendingConfirm([]);
        setPendingError(null);
        setPendingLoading(false);
      } catch {
        setAssignees([]);
        setListError('Không tải được danh sách nhân viên đang cấp');
      } finally {
        setPendingLoading(false);
        setListLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(action).catch(() => {});
    setMessage('');
    setForm((prev) => ({
      ...prev,
      deviceId: '',
      ...(action === 'issue'
        ? { employeeName: '', employeeCode: '', department: '', employeeEmail: '' }
        : { returnReason: '' }),
    }));
    setAssignedPage(1);
  }, [action]);

  const handleAssigneeSelect = (code: string) => {
    if (!code) {
      setForm((prev) => ({
        ...prev,
        employeeName: '',
        employeeCode: '',
        employeeEmail: '',
        department: '',
        deviceId: '',
      }));
      setDevices([]);
      return;
    }

    const selected = assignees.find((a) => a.employeeCode === code);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        employeeName: selected.employeeName,
        employeeCode: selected.employeeCode,
        department: selected.department,
        employeeEmail: selected.employeeEmail,
        deviceId: '',
      }));
      setDevices(selected.devices);
      api
        .get<ActiveAssignee[]>('/assignments/active', { params: { employeeCode: selected.employeeCode } })
        .then((res) => {
          const detail = res.data?.[0];
          if (detail?.devices?.length) {
            setDevices(detail.devices);
          }
        })
        .catch(() => {});
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      await api.post('/assignments', {
        ...form,
        deviceId: Number(form.deviceId),
        action,
      });
      setMessage(action === 'issue' ? 'Đã cấp phát & gửi email' : 'Đã thu hồi');
      setForm((prev) => ({
        ...prev,
        deviceId: '',
        ...(isReturn
          ? { employeeName: '', employeeCode: '', department: '', employeeEmail: '', returnReason: '' }
          : {}),
      }));
      await loadData(action);
      setAssignedPage(1);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredAssigned = assignedList.filter((row) => {
    const term = assignedSearch.trim().toLowerCase();
    const matchesTerm =
      !term ||
      row.deviceName.toLowerCase().includes(term) ||
      row.deviceCode.toLowerCase().includes(term) ||
      row.employeeName.toLowerCase().includes(term) ||
      row.employeeCode.toLowerCase().includes(term) ||
      row.department.toLowerCase().includes(term);
    const matchesStatus = !assignedStatus || row.status === assignedStatus;
    return matchesTerm && matchesStatus;
  });
  const assignedTotalPages = Math.max(1, Math.ceil(filteredAssigned.length / assignedPageSize));
  const assignedCurrentPage = Math.min(assignedPage, assignedTotalPages);
  const assignedPaged = filteredAssigned.slice((assignedCurrentPage - 1) * assignedPageSize, assignedCurrentPage * assignedPageSize);

  return (
    <div className="container-fluid">
      <div className="d-flex gap-2 mb-3">
        <button className={`btn ${action === 'issue' ? 'btn-primary' : 'btn-outline-light'}`} onClick={() => setAction('issue')}>
          Cấp phát
        </button>
        <button className={`btn ${action === 'return' ? 'btn-primary' : 'btn-outline-light'}`} onClick={() => setAction('return')}>
          Thu hồi
        </button>
      </div>
      <div className="card-ghost">
        <h5 className="mb-3">{action === 'issue' ? 'Cấp phát thiết bị' : 'Thu hồi thiết bị'}</h5>
        {listError && <div className="alert alert-danger py-2">{listError}</div>}
        <form className="row g-3" onSubmit={submit}>
          <div className="col-md-6">
            <label className="form-label">Tên nhân viên</label>
            {isReturn ? (
              <select className="form-select" value={form.employeeCode} onChange={(e) => handleAssigneeSelect(e.target.value)} required disabled={listLoading}>
                <option value="">Chọn nhân viên đang được cấp thiết bị</option>
                {assignees.map((a) => (
                  <option key={a.employeeCode} value={a.employeeCode}>
                    {a.employeeName} ({a.employeeCode})
                  </option>
                ))}
              </select>
            ) : (
              <input className="form-control" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required />
            )}
          </div>
          <div className="col-md-3">
            <label className="form-label">Mã NV</label>
            <input className="form-control" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required readOnly={isReturn} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Phòng ban</label>
            <input className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required readOnly={isReturn} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={form.employeeEmail} onChange={(e) => setForm({ ...form, employeeEmail: e.target.value })} required readOnly={isReturn} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Thiết bị</label>
            <select
              className="form-select"
              value={form.deviceId}
              onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
              required
              disabled={listLoading || (isReturn && !form.employeeCode)}
            >
              <option value="">{isReturn ? 'Chọn thiết bị đang cấp cho nhân viên' : 'Chọn thiết bị (Trạng thái trống)'}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} - {d.code}
                </option>
              ))}
            </select>
          </div>
          {isReturn && (
            <div className="col-12">
              <label className="form-label">Lý do thu hồi</label>
              <textarea
                className="form-control"
                value={form.returnReason}
                onChange={(e) => setForm({ ...form, returnReason: e.target.value })}
                placeholder="Nhập lý do thu hồi (bắt buộc)"
                required
              />
            </div>
          )}
          <div className="col-12">
            <label className="form-label">Nội dung</label>
            <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {submitError && <div className="alert alert-danger py-2">{submitError}</div>}
          {message && <div className="alert alert-success py-2">{message}</div>}
          <div className="col-12 d-flex justify-content-end">
            <button className="btn btn-primary" disabled={submitLoading || listLoading}>
              {submitLoading ? 'Đang xử lý...' : 'Xác nhận & Gửi mail'}
            </button>
          </div>
        </form>
      </div>

      {action === 'issue' && (
        <>
          <div className="card-ghost mt-3">
            <h5 className="mb-3">Thiết bị đang cấp</h5>
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder="Tìm theo thiết bị, mã, nhân viên, phòng ban..."
                  value={assignedSearch}
                  onChange={(e) => {
                    setAssignedSearch(e.target.value);
                    setAssignedPage(1);
                  }}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={assignedStatus}
                  onChange={(e) => {
                    setAssignedStatus(e.target.value);
                    setAssignedPage(1);
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="assigned">Đã cấp</option>
                  <option value="available">Còn trống</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="retired">Ngưng dùng</option>
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>Mã</th>
                    <th>Nhân viên</th>
                    <th>Mã NV</th>
                    <th>Phòng ban</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        Đang tải...
                      </td>
                    </tr>
                  ) : assignedPaged.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        {assignedSearch || assignedStatus ? 'Không tìm thấy bản ghi phù hợp.' : 'Chưa có thiết bị nào đang được cấp.'}
                      </td>
                    </tr>
                  ) : (
                    assignedPaged.map((row) => (
                      <tr key={`${row.deviceCode}-${row.employeeCode}`}>
                        <td>{row.deviceName}</td>
                        <td className="text-muted small">{row.deviceCode}</td>
                        <td>{row.employeeName}</td>
                        <td className="text-muted small">{row.employeeCode}</td>
                        <td>{row.department || '-'}</td>
                        <td className="text-capitalize">{statusLabel(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div className="text-muted small">
                Trang {assignedCurrentPage}/{assignedTotalPages} · {filteredAssigned.length} bản ghi
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-outline-light btn-sm"
                  disabled={assignedCurrentPage <= 1}
                  onClick={() => setAssignedPage((p) => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>
                <button
                  className="btn btn-outline-light btn-sm"
                  disabled={assignedCurrentPage >= assignedTotalPages}
                  onClick={() => setAssignedPage((p) => Math.min(assignedTotalPages, p + 1))}
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
          <div className="card-ghost mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Chờ xác nhận</h5>
              {pendingLoading && <span className="text-muted small">Đang tải...</span>}
            </div>
            {pendingError && <div className="alert alert-danger py-2">{pendingError}</div>}
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle">
                <thead>
                  <tr>
                    <th>Hành động</th>
                    <th>Thiết bị</th>
                    <th>Nhân viên</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Biên bản</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        Đang tải...
                      </td>
                    </tr>
                  ) : pendingConfirm.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        Chưa có yêu cầu chờ xác nhận.
                      </td>
                    </tr>
                  ) : (
                    pendingConfirm.map((item) => {
                      const badge = assignmentStatus(item.status);
                      return (
                        <tr key={item.id}>
                          <td>
                            <span className={`badge ${item.action === 'issue' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {item.action === 'issue' ? 'Cấp phát' : 'Thu hồi'}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold">{item.device?.name}</div>
                            <div className="small text-muted">{item.device?.code}</div>
                          </td>
                          <td>
                            <div className="fw-semibold">{item.employeeName}</div>
                            <div className="small text-muted">{item.employeeCode}</div>
                          </td>
                          <td>{item.occurredAt ? dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm') : '-'}</td>
                          <td>
                            <span className={`badge ${badge.className}`}>{badge.label}</span>
                          </td>
                          <td>
                            <DownloadPdfButton assignment={item} size="sm" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignPage;
