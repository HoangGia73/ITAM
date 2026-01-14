🖥️ ITAM – Hệ thống Quản lý Tài sản IT
📦 Quản lý • 🔄 Cấp phát • 📩 Xác nhận • 📊 Báo cáo
________________________________________
📌 1. Mô tả tổng quan
ITAM (IT Asset Management) là hệ thống quản lý tài sản CNTT dành cho bộ phận IT doanh nghiệp, giúp theo dõi toàn bộ vòng đời thiết bị:
👉 Onboard → Cấp phát → Xác nhận → Thu hồi → Bảo trì → Báo cáo
Hệ thống gồm 2 phần tách biệt rõ ràng:
🔧 Backend
≠	🟢 Node.js + Express
≠	🗄️ PostgreSQL + Sequelize
≠	🔐 Xác thực JWT
≠	📩 Gửi email (Nodemailer – Gmail)
≠	📄 Sinh phiếu PDF (Puppeteer + Handlebars)
🎨 Frontend
≠	⚛️ React + Vite
≠	🧭 Giao diện quản lý thiết bị & luồng cấp phát / thu hồi
≠	📱 SPA, dễ mở rộng
________________________________________
✨ 2. Tính năng chính
≠	🖥️ Quản lý thiết bị IT
+	Thêm / sửa / xoá
+	Import Excel
+	Sinh mã thiết bị tự động
≠	🔄 Cấp phát & thu hồi tài sản
+	Gửi email thông báo
+	Đính kèm phiếu bàn giao PDF
≠	📩 Xác nhận nhận tài sản
+	Qua link email
+	⏱️ Token hết hạn sau 30 phút
≠	📷 Tra cứu thiết bị bằng QR Code
+	Public
+	Không cần đăng nhập
≠	📊 Dashboard & thống kê
+	Tổng số thiết bị
+	Trạng thái sử dụng
+	Cảnh báo bảo hành / bảo trì
≠	📑 Báo cáo & export Excel
+	Lịch sử cấp phát
+	Báo cáo tổng hợp theo thời gian
________________________________________
🏗️ 3. Kiến trúc hệ thống
≠	🌐 API Backend
+	Entry: backend/src/index.js
+	REST API: /api/...
≠	🗄️ Database
+	PostgreSQL
+	Tự động sequelize.sync() khi khởi động
≠	📁 Lưu trữ file
+	backend/uploads
+	Public qua /uploads/...
≠	📩 Email
+	Nodemailer (Gmail – App Password)
≠	📄 PDF
+	Puppeteer render template Handlebars
+	backend/src/templates/*.hbs
≠	🎨 Frontend
+	Vite SPA
+	Thư mục frontend/
≠	________________________________________
⚙️ 4. Cấu hình khi mới clone
📦 4.1 Cài dependencies
cd backend
npm install

cd ../frontend
npm install
________________________________________
🔐 4.2 Cấu hình Backend
📄 Tạo file: backend/.env
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itam
DB_USER=postgres
DB_PASS=your_password
# Hoặc dùng DATABASE_URL

# Auth
JWT_SECRET=change_me

# Mail
MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="ITAM System <your@gmail.com>"

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_CONFIRM_URL=http://localhost:5173/confirm-assignment

# Optional (hiển thị trên PDF)
COMPANY_NAME=ITAM
HANDOVER_NAME=Bộ phận IT
🔔 Lưu ý quan trọng
≠	🔑 MAIL_PASS phải là Gmail App Password
≠	🧠 Có DATABASE_URL → ưu tiên dùng
≠	👤 Tự tạo admin mặc định khi chạy lần đầu:
+	Email: admin@itam.local
+	Password: admin123
________________________________________
🌐 4.3 Cấu hình Frontend (tuỳ chọn)
📄 frontend/.env
VITE_API_URL=http://localhost:5000/api
________________________________________
▶️ 4.4 Chạy hệ thống
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
🌍 Truy cập:
≠	Frontend: http://localhost:5173
≠	API: http://localhost:5000/api
________________________________________
🔁 5. Các luồng nghiệp vụ chính
🔐 Đăng nhập
≠	POST /api/auth/login
≠	Trả về: token, user, alerts, modules
________________________________________
🖥️ Quản lý thiết bị
≠	GET /api/devices
≠	POST /api/devices
≠	PUT /api/devices/:id
≠	DELETE /api/devices/:id
≠	POST /api/devices/import
≠	GET /api/devices/metrics/counts
≠	GET /api/devices/issues/alerts
________________________________________
📦 Cấp phát tài sản
1.	IT tạo phiếu → action=issue
2.	📄 Sinh PDF + 📩 gửi email
3.	👨‍💼 Nhân viên xác nhận qua link
4.	✅ Assignment CONFIRMED, Device assigned
________________________________________
🔄 Thu hồi tài sản
≠	Tạo phiếu action=return
≠	Device → available
≠	📩 Email thông báo
________________________________________
⏱️ Token hết hạn
≠	Hết hạn sau 30 phút
≠	Trạng thái PENDING_CONFIRM
≠	🔁 Có thể resend email xác nhận
________________________________________
📷 Tra cứu QR (Public)
≠	GET /api/devices/public/:code
≠	FE route: /qr/:code
________________________________________
📊 Báo cáo & Export
≠	GET /api/assignments
≠	GET /api/assignments/export
≠	GET /api/reports/export
________________________________________
🧠 6. Kịch bản sử dụng tiêu biểu
≠	🆕 Onboard thiết bị mới
≠	👤 Cấp phát cho nhân viên
≠	🔄 Thu hồi khi nghỉ việc / đổi thiết bị
≠	⚠️ Theo dõi bảo hành / bảo trì
≠	👥 Quản lý user (ADMIN)
________________________________________
⚠️ 7. Lưu ý kỹ thuật
≠	⚙️ sequelize.sync() (không migration tay)
≠	📄 Puppeteer tải Chromium lần đầu (cần dung lượng)
≠	📁 uploads/ được public
≠	🚫 Không commit node_modules
≠	✅ Nên có .env.example

