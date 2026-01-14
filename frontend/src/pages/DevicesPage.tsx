import { type FormEvent, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code";
import api from "../utils/api";
import type { Device } from "../types";

const CATEGORY_OPTIONS = ["Laptop", "PC", "Máy in", "Máy chiếu", "Máy photocopy", "Server", "Network device"];
const LIFECYCLE_OPTIONS: { value: NonNullable<Device["lifecycleStatus"]>; label: string }[] = [
  { value: "normal", label: "Bình thường" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "repair", label: "Đang sửa" },
  { value: "in_transit", label: "Đang vận chuyển" },
  { value: "retired", label: "Hỏng / Retire" },
];
const ASSIGNMENT_LABEL = (status: Device["status"]) => (status === "assigned" ? "Đã cấp" : "Còn trống");
const lifecycleLabel = (lifecycle?: Device["lifecycleStatus"]) => LIFECYCLE_OPTIONS.find((s) => s.value === lifecycle)?.label || "Bình thường";

const initialForm = () => ({
  name: "",
  category: "",
  purchaseDate: dayjs().format("YYYY-MM-DD"),
  warrantyMonths: 12,
  maintenanceIntervalDays: 30,
  notes: "",
});

const DevicesPage = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState(initialForm());
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [maintenanceId, setMaintenanceId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Device["lifecycleStatus"] | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [lifecycleDraft, setLifecycleDraft] = useState<Record<number, NonNullable<Device["lifecycleStatus"]>>>({});
  const [reasonDraft, setReasonDraft] = useState<Record<number, string>>({});
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [qrDevice, setQrDevice] = useState<Device | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrSvgRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await api.get("/devices");
      setDevices(res.data);
    } catch (e: any) {
      setListError(e?.response?.data?.message || "Không tải được danh sách thiết bị");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    setCopiedLink(false);
  }, [qrDevice]);

  const submitDevice = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setListError(null);
    try {
      if (editingId) {
        await api.put(`/devices/${editingId}`, form);
      } else {
        await api.post("/devices", form);
      }
      await load();
      setForm(initialForm());
      setEditingId(null);
    } catch (err: any) {
      setListError(err?.response?.data?.message || "Không lưu được thiết bị");
    } finally {
      setLoading(false);
    }
  };

  const markMaintenance = async (device: Device) => {
    const ok = window.confirm(`Xác nhận bảo trì cho ${device.name}?`);
    if (!ok) return;
    setMaintenanceId(device.id);
    try {
      await api.post(`/devices/${device.id}/maintenance`);
      await load();
    } catch (e: any) {
      setListError(e?.response?.data?.message || "Không cập nhật được bảo trì");
    } finally {
      setMaintenanceId(null);
    }
  };

  const handleLifecycleChange = (id: number, status: NonNullable<Device["lifecycleStatus"]>) => {
    setLifecycleDraft((prev) => ({ ...prev, [id]: status }));
  };

  const updateStatus = async (device: Device) => {
    const currentLifecycle = device.lifecycleStatus || "normal";
    const newLifecycle = lifecycleDraft[device.id] || currentLifecycle;
    const reason = (reasonDraft[device.id] ?? device.lifecycleReason ?? "").trim();

    if (newLifecycle === currentLifecycle && reason === (device.lifecycleReason || "").trim()) return;
    if (newLifecycle !== currentLifecycle && !reason) {
      alert("Vui lòng nhập lý do khi đổi trạng thái.");
      return;
    }

    const ok = window.confirm(
      `Xác nhận chuyển trạng thái "${lifecycleLabel(currentLifecycle)}" -> "${lifecycleLabel(newLifecycle)}" cho ${device.name}?`,
    );
    if (!ok) return;

    setStatusUpdating(device.id);
    setListError(null);
    try {
      await api.put(`/devices/${device.id}`, { lifecycleStatus: newLifecycle, lifecycleReason: reason || null });
      await load();
    } catch (e: any) {
      setListError(e?.response?.data?.message || "Không cập nhật được trạng thái");
    } finally {
      setStatusUpdating(null);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term || d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term) || (d.category || "").toLowerCase().includes(term);
    const matchesStatus = !statusFilter || d.lifecycleStatus === statusFilter;
    const matchesCategory = !categoryFilter || d.category === categoryFilter;
    return matchesTerm && matchesStatus && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const uniqueCategories = Array.from(new Set(devices.map((d) => d.category).filter(Boolean))) as string[];
  const qrLink = qrDevice && typeof window !== "undefined" ? `${window.location.origin}/qr/${encodeURIComponent(qrDevice.code)}` : "";

  const copyQrLink = async () => {
    if (!qrLink) return;
    try {
      await navigator.clipboard.writeText(qrLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1200);
    } catch {
      setCopiedLink(false);
    }
  };

  const closeQr = () => {
    setQrDevice(null);
    setCopiedLink(false);
  };

  const downloadQrImage = () => {
    const svg = qrSvgRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!qrDevice || !svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const size = 200;
    const padding = 12;
    const textLines = [
      `T\u00ean thi\u1ebft b\u1ecb: ${qrDevice.name}`,
      `Ng\u00e0y mua: ${qrDevice.purchaseDate || "-"}`,
      `B\u1ea3o tr\u00ec g\u1ea7n nh\u1ea5t: ${qrDevice.lastMaintenanceDate || "Ch\u01b0a c\u00f3"}`,
    ];
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const font = "14px Arial";
      const lineHeight = 18;
      ctx.font = font;
      const maxTextWidth = Math.max(size, ...textLines.map((line) => ctx.measureText(line).width));
      const canvasWidth = Math.ceil(maxTextWidth + padding * 2);
      const textHeight = textLines.length * lineHeight;
      const canvasHeight = padding + size + 12 + textHeight + padding;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      ctx.font = font; // reset after resizing
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const qrX = (canvas.width - size) / 2;
      ctx.drawImage(img, qrX, padding, size, size);
      ctx.fillStyle = "#0f172a";
      ctx.textBaseline = "top";
      let textY = padding + size + 12;
      textLines.forEach((line) => {
        ctx.fillText(line, padding, textY);
        textY += lineHeight;
      });
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = `${qrDevice.name}-${qrDevice.code}`.replace(/\s+/g, "-");
      link.href = pngUrl;
      link.download = `${safeName}.png`;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error("Không tìm thấy sheet dữ liệu");
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (!rows.length) throw new Error("File Excel rỗng");

      const devicesPayload = rows
        .map((row) => {
          const byKey = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
          return {
            name: String(byKey.name || "").trim(),
            category: String(byKey.category || "").trim(),
            purchaseDate: String(byKey.purchasedate || byKey.purchase_date || "").trim(),
            warrantyMonths: Number(byKey.warrantymonths || byKey.warranty_months) || 12,
            maintenanceIntervalDays: Number(byKey.maintenanceintervaldays || byKey.maintenance_interval_days) || 30,
            notes: String(byKey.notes || "").trim(),
            lifecycleStatus: String(byKey.lifecyclestatus || byKey.lifecycle_status || "normal").trim() || "normal",
            lifecycleReason: String(byKey.lifecyclereason || byKey.lifecycle_reason || "").trim() || null,
          };
        })
        .filter((item) => item.name && item.purchaseDate);

      if (!devicesPayload.length) throw new Error("Không có dòng hợp lệ (yêu cầu name, purchaseDate)");
      await api.post("/devices/import", { devices: devicesPayload });
      await load();
    } catch (e: any) {
      setImportError(
        e?.response?.data?.message ||
          e?.message ||
          "Import thất bại. Cần các cột: name, category, purchaseDate, warrantyMonths, maintenanceIntervalDays, notes, lifecycleStatus, lifecycleReason (code có thể để trống, hệ thống tự sinh theo danh mục)",
      );
      setImporting(false);
    }
  };

  const startEdit = (device: Device) => {
    setEditingId(device.id);
    setForm({
      name: device.name || "",
      category: device.category || "",
      purchaseDate: device.purchaseDate || dayjs().format("YYYY-MM-DD"),
      warrantyMonths: device.warrantyMonths || 12,
      maintenanceIntervalDays: device.maintenanceIntervalDays || 30,
      notes: device.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm());
  };

  const deleteDevice = async (device: Device) => {
    const ok = window.confirm(`Xóa thiết bị ${device.name} (${device.code})?`);
    if (!ok) return;
    setDeletingId(device.id);
    setListError(null);
    try {
      await api.delete(`/devices/${device.id}`);
      await load();
    } catch (e: any) {
      setListError(e?.response?.data?.message || "Không xóa được thiết bị");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="container-fluid">
        <div className="card-ghost mb-3">
          <h5 className="mb-3">Danh sách thiết bị</h5>
          {listError && <div className="alert alert-danger py-2">{listError}</div>}
          <div className="d-flex flex-column flex-md-row gap-2 mb-2 align-items-md-center">
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0">Import Excel (.xlsx):</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="form-control form-control-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
                disabled={importing}
              />
            </div>
            {importError && <div className="text-danger small">{importError}</div>}
            {importing && <div className="text-muted small">Đang import...</div>}
          </div>
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Tìm theo tên, mã, danh mục..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as Device["lifecycleStatus"] | "");
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                {LIFECYCLE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả danh mục</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Mã</th>
                  <th>Danh mục</th>
                  <th>Ngày nhập</th>
                  <th>Hết bảo hành</th>
                  <th>Lần bảo trì cuối</th>
                  <th>Đã cấp</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      Đang tải...
                    </td>
                  </tr>
                ) : pagedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      {search || statusFilter || categoryFilter ? "Không tìm thấy thiết bị phù hợp." : "Chưa có thiết bị."}
                    </td>
                  </tr>
                ) : (
                  pagedDevices.map((d) => {
                    const selectValue = lifecycleDraft[d.id] || d.lifecycleStatus || "normal";
                    return (
                      <tr key={d.id}>
                        <td>{d.name}</td>
                        <td className="text-muted small">{d.code}</td>
                        <td>{d.category || "-"}</td>
                        <td>{d.purchaseDate}</td>
                        <td className={d.warrantyEndDate && dayjs(d.warrantyEndDate).isBefore(dayjs()) ? "text-danger" : ""}>
                          {d.warrantyEndDate || "-"}
                        </td>
                        <td>
                          {d.lastMaintenanceDate || "-"}{" "}
                          {d.maintenanceDue && (
                            <button className="badge bg-danger border-0 ms-2" onClick={() => markMaintenance(d)} disabled={maintenanceId === d.id}>
                              {maintenanceId === d.id ? "Đang cập nhật..." : "Tới hạn bảo trì"}
                            </button>
                          )}
                        </td>
                        <td>
                          <span className="status-chip bg-opacity-50 bg-primary text-white text-capitalize">{ASSIGNMENT_LABEL(d.status)}</span>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <select
                              className="form-select form-select-sm"
                              value={selectValue}
                              onChange={(e) => handleLifecycleChange(d.id, e.target.value as NonNullable<Device["lifecycleStatus"]>)}
                              disabled={statusUpdating === d.id}
                            >
                              {LIFECYCLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <input
                              className="form-control form-control-sm"
                              placeholder="Lý do thay đổi (bắt buộc khi đổi trạng thái)"
                              value={reasonDraft[d.id] ?? d.lifecycleReason ?? ""}
                              onChange={(e) => setReasonDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
                              disabled={statusUpdating === d.id}
                            />
                            <button className="btn btn-sm btn-outline-light" onClick={() => updateStatus(d)} disabled={statusUpdating === d.id}>
                              {statusUpdating === d.id ? "Đang lưu..." : "Cập nhật trạng thái"}
                            </button>
                            {d.lifecycleReason && <div className="small text-muted">{d.lifecycleReason}</div>}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button className="btn btn-sm btn-outline-info" onClick={() => setQrDevice(d)}>
                              QR
                            </button>
                            <button className="btn btn-sm btn-outline-light" onClick={() => startEdit(d)}>
                              Sửa
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteDevice(d)}
                              disabled={deletingId === d.id}
                            >
                              {deletingId === d.id ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="text-muted small">
              Trang {currentPage}/{totalPages} - {filteredDevices.length} thiết bị
            </div>
            <div className="btn-group">
              <button className="btn btn-outline-light btn-sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Trước
              </button>
              <button
                className="btn btn-outline-light btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="card-ghost">
          <h5 className="mb-3">{editingId ? "Cập nhật thiết bị" : "Thêm thiết bị"}</h5>
          <form className="row g-3" onSubmit={submitDevice}>
            <div className="col-md-4">
              <label className="form-label">Tên thiết bị</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Danh mục</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Chọn danh mục</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Ngày nhập</label>
              <input
                type="date"
                className="form-control"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Thời gian bảo hành (tháng)</label>
              <input
                type="number"
                className="form-control"
                value={form.warrantyMonths}
                onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Chu kỳ bảo trì (ngày)</label>
              <input
                type="number"
                className="form-control"
                value={form.maintenanceIntervalDays}
                onChange={(e) => setForm({ ...form, maintenanceIntervalDays: Number(e.target.value) })}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="col-12 d-flex justify-content-end gap-2">
              {editingId && (
                <button type="button" className="btn btn-outline-light" onClick={cancelEdit} disabled={loading}>
                  Hủy
                </button>
              )}
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Lưu thiết bị"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {qrDevice && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ background: "rgba(3,7,18,0.75)", zIndex: 1050 }}>
          <div className="d-flex align-items-center justify-content-center h-100 px-3">
            <div
              className="card-ghost position-relative"
              style={{ maxWidth: 440, width: "100%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", color: "#e5e7eb" }}
            >
              <button type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-2" aria-label="Close" onClick={closeQr} />
              <div className="text-center mb-3">
                <h5 className="mb-0 text-white">{qrDevice.name}</h5>
                <div className="small" style={{ color: "#cbd5e1" }}>
                  {qrDevice.code}
                </div>
              </div>
              <div className="d-flex flex-column align-items-center gap-3">
                <div className="bg-white p-3 rounded shadow-sm" ref={qrSvgRef}>
                  <QRCode value={qrLink || qrDevice.code} size={200} fgColor="#0f172a" />
                </div>
                <div className="small text-center" style={{ color: "#cbd5e1" }}>
                  Quét mã để xem trang thông tin công khai của thiết bị.
                </div>
                <div className="w-100">
                  <div className="small mb-1" style={{ color: "#cbd5e1" }}>
                    Liên kết công khai
                  </div>
                  <div className="text-break small rounded p-2 mb-2" style={{ background: "#111827", color: "#f8fafc" }}>
                    {qrLink || "Đang tạo liên kết..."}
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-sm btn-outline-info text-white border-info" onClick={copyQrLink}>
                      {copiedLink ? "Đã copy" : "Copy link"}
                    </button>
                    <button className="btn btn-sm btn-outline-light" onClick={downloadQrImage}>
                      Tải QR
                    </button>
                    {qrLink && (
                      <a className="btn btn-sm btn-primary" href={qrLink} target="_blank" rel="noreferrer">
                        Mở trang QR
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevicesPage;
