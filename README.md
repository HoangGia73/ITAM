🖥️ ITAM – Hệ thống Quản lý Tài sản IT
1. Mô tả tổng quan

ITAM (IT Asset Management) là hệ thống quản lý tài sản CNTT, phục vụ cho bộ phận IT trong doanh nghiệp nhằm theo dõi vòng đời thiết bị từ onboard → cấp phát → thu hồi → bảo trì → báo cáo.

Hệ thống gồm 2 phần tách biệt:

Backend

Node.js + Express

PostgreSQL + Sequelize

Xác thực JWT

Gửi email (Nodemailer – Gmail)

Sinh phiếu PDF (Puppeteer + Handlebars)

Frontend

React + Vite

Giao diện quản lý thiết bị, cấp phát & thu hồi tài sản

2. Tính năng chính

Quản lý thiết bị IT (thêm / sửa / xoá / import Excel).

Thống kê & dashboard tổng hợp.

Cấp phát / thu hồi tài sản.

Gửi email thông báo kèm phiếu bàn giao PDF.

Nhân viên xác nhận nhận tài sản qua link email
(token hết hạn sau 30 phút).

Tra cứu thiết bị qua QR Code (public, không cần đăng nhập).

Báo cáo & export Excel (lịch sử, tổng hợp theo thời gian).

3. Kiến trúc hệ thống

API Backend

Entry: backend/src/index.js

REST API: /api/...

Database

PostgreSQL

Tự động sequelize.sync() khi khởi động (không cần migration tay)

Lưu trữ file

Thư mục: backend/uploads

Public qua endpoint: /uploads/...

Email

Nodemailer (Gmail – App Password)

PDF

Puppeteer render template Handlebars

Template nằm tại: backend/src/templates/*.hbs

Frontend

SPA sử dụng Vite

Thư mục: frontend/

4. Cấu hình khi mới clone
4.1 Cài dependencies
cd backend
npm install

cd ../frontend
npm install

4.2 Cấu hình Backend

Tạo file: backend/.env

Ví dụ cấu hình:

PORT=5000

# Database
# DATABASE_URL=postgres://user:pass@host:5432/itam
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itam
DB_USER=postgres
DB_PASS=your_password

# Auth
JWT_SECRET=change_me

# Mail
MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="ITAM System <your@gmail.com>"

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_CONFIRM_URL=http://localhost:5173/confirm-assignment

# Optional (hiển thị trên phiếu PDF)
COMPANY_NAME=ITAM
HANDOVER_NAME=Bộ phận IT


Lưu ý:

MAIL_PASS phải là Gmail App Password.

Nếu có DATABASE_URL → hệ thống sẽ ưu tiên biến này.

Khi khởi động lần đầu, hệ thống tự tạo admin mặc định:

Email: admin@itam.local

Mật khẩu: admin123

4.3 Cấu hình Frontend (tuỳ chọn)

Nếu muốn đổi API URL, tạo file frontend/.env:

VITE_API_URL=http://localhost:5000/api


Nếu không có, FE mặc định dùng http://localhost:5000/api.

4.4 Chạy hệ thống
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev


Truy cập:

Frontend: http://localhost:5173

Backend API: http://localhost:5000/api

5. Các luồng nghiệp vụ chính
5.1 Đăng nhập

Endpoint: POST /api/auth/login

Trả về:

token

user

alerts

modules

Frontend lưu token vào localStorage và gắn vào header:

Authorization: Bearer <token>

5.2 Quản lý thiết bị

Lấy danh sách: GET /api/devices

Thêm mới: POST /api/devices

Cập nhật: PUT /api/devices/:id

Xoá: DELETE /api/devices/:id

Import Excel: POST /api/devices/import

Thống kê: GET /api/devices/metrics/counts

Cảnh báo (bảo hành / bảo trì):
GET /api/devices/issues/alerts

5.3 Cấp phát tài sản (Issue)

IT tạo phiếu cấp phát:

POST /api/assignments
action = issue


Hệ thống:

Sinh PDF

Lưu tại uploads/assignments

Gửi email cho nhân viên

Nhân viên xác nhận:

GET/POST /api/assignments/confirm?token=...


Nếu xác nhận thành công:

Assignment → CONFIRMED

Device → assigned

5.4 Thu hồi tài sản (Return)

IT tạo phiếu thu hồi:

POST /api/assignments
action = return


Device chuyển về trạng thái available.

Gửi email thông báo (kèm PDF nếu tạo thành công).

5.5 Token xác nhận hết hạn

Token xác nhận hết hạn sau 30 phút.

Assignment bị đánh dấu PENDING_CONFIRM.

IT có thể gửi lại email xác nhận:

POST /api/assignments/:id/resend-email

POST /api/assignments/confirm-resend

5.6 Tra cứu QR (Public)

Endpoint:

GET /api/devices/public/:code


Dùng cho trang FE:

/qr/:code


Không cần đăng nhập.

5.7 Báo cáo & Export Excel

Lịch sử cấp phát:

GET /api/assignments


Export lịch sử:

GET /api/assignments/export


Báo cáo tổng hợp:

GET /api/reports/export?range=day|week|month


hoặc:

?start=YYYY-MM-DD&end=YYYY-MM-DD

6. Kịch bản sử dụng tiêu biểu

Onboard thiết bị mới

Thêm tay hoặc import Excel.

Hệ thống tự sinh mã thiết bị nếu chưa có.

Cấp phát cho nhân viên

IT tạo phiếu → nhân viên xác nhận → thiết bị assigned.

Thu hồi thiết bị

IT tạo phiếu thu hồi → thiết bị available.

Theo dõi bảo hành / bảo trì

Dashboard hiển thị cảnh báo.

Cập nhật lastMaintenanceDate.

Quản lý người dùng

Chỉ ADMIN được tạo / sửa user:

GET /api/users
POST /api/users
PUT /api/users/:id

7. Lưu ý kỹ thuật

Backend dùng sequelize.sync() → phù hợp môi trường nội bộ / demo.

Puppeteer tải Chromium lần đầu → cần thời gian & dung lượng.

Thư mục uploads/ được public qua /uploads.

Không commit node_modules (BE & FE).

Khuyến nghị dùng .env.example cho triển khai thực tế.