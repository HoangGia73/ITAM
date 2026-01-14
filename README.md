<h1>🖥️ ITAM – Hệ thống Quản lý Tài sản IT</h1>

<p>📦 Quản lý • 🔄 Cấp phát • 📩 Xác nhận • 📊 Báo cáo</p>

<hr>

<h2>📌 1. Mô tả tổng quan</h2>

<p>
ITAM (IT Asset Management) là hệ thống quản lý tài sản CNTT dành cho bộ phận IT doanh nghiệp,
giúp theo dõi toàn bộ vòng đời thiết bị:
</p>

<p>👉 Onboard → Cấp phát → Xác nhận → Thu hồi → Bảo trì → Báo cáo</p>

<p>Hệ thống gồm 2 phần tách biệt rõ ràng:</p>

<p><strong>🔧 Backend</strong></p>
<p>🟢 Node.js + Express</p>
<p>🗄️ PostgreSQL + Sequelize</p>
<p>🔐 Xác thực JWT</p>
<p>📩 Gửi email (Nodemailer – Gmail)</p>
<p>📄 Sinh phiếu PDF (Puppeteer + Handlebars)</p>

<p><strong>🎨 Frontend</strong></p>
<p>⚛️ React + Vite</p>
<p>🧭 Giao diện quản lý thiết bị & luồng cấp phát / thu hồi</p>
<p>📱 SPA, dễ mở rộng</p>

<hr>

<h2>✨ 2. Tính năng chính</h2>

<p><strong>🖥️ Quản lý thiết bị IT</strong></p>
<p>Thêm / sửa / xoá</p>
<p>Import Excel</p>
<p>Sinh mã thiết bị tự động</p>

<p><strong>🔄 Cấp phát & thu hồi tài sản</strong></p>
<p>Gửi email thông báo</p>
<p>Đính kèm phiếu bàn giao PDF</p>

<p><strong>📩 Xác nhận nhận tài sản</strong></p>
<p>Qua link email</p>
<p>⏱️ Token hết hạn sau 30 phút</p>

<p><strong>📷 Tra cứu thiết bị bằng QR Code</strong></p>
<p>Public</p>
<p>Không cần đăng nhập</p>

<p><strong>📊 Dashboard & thống kê</strong></p>
<p>Tổng số thiết bị</p>
<p>Trạng thái sử dụng</p>
<p>Cảnh báo bảo hành / bảo trì</p>

<p><strong>📑 Báo cáo & export Excel</strong></p>
<p>Lịch sử cấp phát</p>
<p>Báo cáo tổng hợp theo thời gian</p>

<hr>

<h2>🏗️ 3. Kiến trúc hệ thống</h2>

<p><strong>🌐 API Backend</strong></p>
<p>Entry: backend/src/index.js</p>
<p>REST API: /api/...</p>

<p><strong>🗄️ Database</strong></p>
<p>PostgreSQL</p>
<p>Tự động sequelize.sync() khi khởi động</p>

<p><strong>📁 Lưu trữ file</strong></p>
<p>backend/uploads</p>
<p>Public qua /uploads/...</p>

<p><strong>📩 Email</strong></p>
<p>Nodemailer (Gmail – App Password)</p>

<p><strong>📄 PDF</strong></p>
<p>Puppeteer render template Handlebars</p>
<p>backend/src/templates/*.hbs</p>

<p><strong>🎨 Frontend</strong></p>
<p>Vite SPA</p>
<p>Thư mục frontend/</p>

<hr>

<h2>⚙️ 4. Cấu hình khi mới clone</h2>

<p><strong>📦 4.1 Cài dependencies</strong></p>

<pre>
cd backend
npm install

cd ../frontend
npm install
</pre>

<p><strong>🔐 4.2 Cấu hình Backend</strong></p>
<p>📄 Tạo file: backend/.env</p>

<pre>
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=itam
DB_USER=postgres
DB_PASS=your_password

JWT_SECRET=change_me

MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="ITAM System &lt;your@gmail.com&gt;"

FRONTEND_URL=http://localhost:5173
FRONTEND_CONFIRM_URL=http://localhost:5173/confirm-assignment

COMPANY_NAME=ITAM
HANDOVER_NAME=Bộ phận IT
</pre>

<p><strong>🔔 Lưu ý quan trọng</strong></p>
<p>🔑 MAIL_PASS phải là Gmail App Password</p>
<p>🧠 Có DATABASE_URL → hệ thống ưu tiên dùng</p>
<p>👤 Admin mặc định khi chạy lần đầu:</p>
<p>Email: admin@itam.local</p>
<p>Password: admin123</p>

<hr>

<h2>🌐 4.3 Cấu hình Frontend (tuỳ chọn)</h2>

<p>📄 frontend/.env</p>

<pre>
VITE_API_URL=http://localhost:5000/api
</pre>

<hr>

<h2>▶️ 4.4 Chạy hệ thống</h2>

<pre>
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
</pre>

<p><strong>🌍 Truy cập</strong></p>
<p>Frontend: http://localhost:5173</p>
<p>API: http://localhost:5000/api</p>

<hr>

<h2>🔁 5. Các luồng nghiệp vụ chính</h2>

<p><strong>🔐 Đăng nhập</strong></p>
<p>POST /api/auth/login</p>
<p>Trả về: token, user, alerts, modules</p>

<p><strong>🖥️ Quản lý thiết bị</strong></p>
<p>GET /api/devices</p>
<p>POST /api/devices</p>
<p>PUT /api/devices/:id</p>
<p>DELETE /api/devices/:id</p>
<p>POST /api/devices/import</p>
<p>GET /api/devices/metrics/counts</p>
<p>GET /api/devices/issues/alerts</p>

<p><strong>📦 Cấp phát tài sản</strong></p>
<p>1. IT tạo phiếu → action=issue</p>
<p>2. 📄 Sinh PDF + 📩 gửi email</p>
<p>3. 👨‍💼 Nhân viên xác nhận qua link</p>
<p>4. ✅ Assignment CONFIRMED, Device assigned</p>

<p><strong>🔄 Thu hồi tài sản</strong></p>
<p>Tạo phiếu action=return</p>
<p>Device → available</p>
<p>📩 Email thông báo</p>

<p><strong>⏱️ Token hết hạn</strong></p>
<p>Hết hạn sau 30 phút</p>
<p>Trạng thái PENDING_CONFIRM</p>
<p>🔁 Có thể resend email xác nhận</p>

<p><strong>📷 Tra cứu QR (Public)</strong></p>
<p>GET /api/devices/public/:code</p>
<p>FE route: /qr/:code</p>

<p><strong>📊 Báo cáo & Export</strong></p>
<p>GET /api/assignments</p>
<p>GET /api/assignments/export</p>
<p>GET /api/reports/export</p>

<hr>

<h2>🧠 6. Kịch bản sử dụng tiêu biểu</h2>

<p>🆕 Onboard thiết bị mới</p>
<p>👤 Cấp phát cho nhân viên</p>
<p>🔄 Thu hồi khi nghỉ việc / đổi thiết bị</p>
<p>⚠️ Theo dõi bảo hành / bảo trì</p>
<p>👥 Quản lý user (ADMIN)</p>

<hr>

<h2>⚠️ 7. Lưu ý kỹ thuật</h2>

<p>⚙️ sequelize.sync() (không migration tay)</p>
<p>📄 Puppeteer tải Chromium lần đầu (cần dung lượng)</p>
<p>📁 uploads/ được public</p>
<p>🚫 Không commit node_modules</p>
<p>✅ Nên có .env.example</p>
