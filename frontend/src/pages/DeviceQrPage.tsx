import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import dayjs from "dayjs";
import QRCode from "react-qr-code";
import api from "../utils/api";
import type { DevicePublicInfo } from "../types";

const DeviceQrPage = () => {
  const { code } = useParams<{ code: string }>();
  const [device, setDevice] = useState<DevicePublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("Thiếu mã thiết bị");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/devices/public/${encodeURIComponent(code)}`);
        setDevice(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Không tải được thông tin thiết bị");
        setDevice(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData().catch(() => {});
  }, [code]);

  const shareUrl = useMemo(() => {
    if (!device) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/qr/${encodeURIComponent(device.code)}`;
  }, [device]);

  const assignment = device?.status === "assigned" ? device.assignment : null;
  const shellStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)" } as const;
  const cardStyle = { background: "rgba(15,23,42,0.92)", border: "1px solid rgba(255,255,255,0.1)", color: "#e7edf7" } as const;
  const labelColor = "#cbd5e1";

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-4">
      <div className="card-ghost w-100" style={{ maxWidth: 980, ...shellStyle }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <div className="small text-uppercase" style={{ color: labelColor }}>
              Thông tin thiết bị
            </div>
            <h3 className="mb-1 text-white">{device?.name || "QR thiết bị"}</h3>
            <div className="small" style={{ color: labelColor }}>
              {device?.code || code}
            </div>
          </div>
          <Link to="/login" className="btn btn-outline-light btn-sm">
            Đăng nhập hệ thống
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-muted py-5">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : !device ? (
          <div className="alert alert-warning">Không tìm thấy thiết bị.</div>
        ) : (
          <div className="row g-3 align-items-stretch">
            <div className="col-md-5">
              <div className="card h-100 text-center p-3" style={cardStyle}>
                <div className="bg-white rounded p-3 d-inline-block mx-auto shadow-sm">
                  <QRCode value={shareUrl || device.code} size={220} fgColor="#0f172a" />
                </div>
                <div className="small mt-3" style={{ color: labelColor }}>
                  Quét mã QR để mở trang thông tin công khai.
                </div>
                <div className="mt-3">
                  <div className="small mb-1" style={{ color: labelColor }}>
                    Liên kết
                  </div>
                  <div className="rounded p-2 text-break small" style={{ background: "#0b1222", color: "#f8fafc" }}>
                    {shareUrl || "Đang tạo liên kết..."}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-7">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                  <span className="badge bg-info text-dark">{device.category || "Không có danh mục"}</span>
                  <span className="badge bg-primary text-light text-uppercase">{device.status}</span>
                  <span className="badge bg-warning text-dark text-uppercase">{device.lifecycleStatus || "normal"}</span>
                </div>

                <div className="mb-3">
                  <div className="fw-semibold mb-1 text-white">Trạng thái cấp phát</div>
                  {assignment ? (
                    <div className="p-2 rounded border border-success border-opacity-50 bg-success bg-opacity-10">
                      <div className="fw-semibold">{assignment.employeeName}</div>
                      <div className="small" style={{ color: labelColor }}>
                        {assignment.employeeCode} - {assignment.department}
                      </div>
                      <div className="small">{assignment.employeeEmail}</div>
                      <div className="small mt-1" style={{ color: labelColor }}>
                        Cấp phát lúc: {dayjs(assignment.occurredAt).format("YYYY-MM-DD HH:mm")}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded border border-secondary border-opacity-50 text-white">Đang trống, chưa cấp phát.</div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="fw-semibold mb-1 text-white">Bảo hành</div>
                  <div className="small" style={{ color: labelColor }}>
                    Ngày mua: {device.purchaseDate}
                  </div>
                  <div className="small" style={{ color: labelColor }}>
                    Thời gian bảo hành: {device.warrantyMonths} tháng
                  </div>
                  <div
                    className={`small ${device.warrantyEndDate && dayjs(device.warrantyEndDate).isBefore(dayjs()) ? "text-danger" : ""}`}
                    style={{ color: device.warrantyEndDate && dayjs(device.warrantyEndDate).isBefore(dayjs()) ? undefined : labelColor }}
                  >
                    Hết hạn: {device.warrantyEndDate || "Chưa xác định"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="fw-semibold mb-1 text-white">Bảo trì</div>
                  <div className="small" style={{ color: labelColor }}>
                    Lần bảo trì cuối: {device.lastMaintenanceDate || "Chưa có"}
                  </div>
                  <div className="small" style={{ color: labelColor }}>
                    Chu kỳ bảo trì: {device.maintenanceIntervalDays || 0} ngày
                  </div>
                  {device.maintenanceDue ? (
                    <div className="small text-danger">Cần bảo trì/kiểm tra ngay.</div>
                  ) : (
                    <div className="small text-success">Chưa đến kỳ bảo trì.</div>
                  )}
                </div>

                {device.notes ? (
                  <div>
                    <div className="fw-semibold mb-1 text-white">Ghi chú</div>
                    <div className="small" style={{ color: labelColor }}>
                      {device.notes}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceQrPage;
