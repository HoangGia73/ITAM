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
<ul>
  <li>🟢 Node.js + Express</li>
  <li>🗄️ PostgreSQL + Sequelize</li>
  <li>🔐 Xác thực JWT</li>
  <li>📩 Gửi email (Nodemailer – Gmail)</li>
  <li>📄 Sinh phiếu PDF (Puppeteer + Handlebars)</li>
</ul>

<p><strong>🎨 Frontend</strong></p>
<ul>
  <li>⚛️ React + Vite</li>
  <li>🧭 Giao diện quản lý thiết bị & luồng cấp phát / thu hồi</li>
  <li>📱 SPA, dễ mở rộng</li>
</ul>

<hr>

<h2>✨ 2. Tính năng chính</h2>

<p><strong>🖥️ Quản lý thiết bị IT</strong></p>
<ul>
  <li>Thêm / sửa / xoá</li>
  <li>Import Excel</li>
  <li>Sinh mã thiết bị tự động</li>
</ul>

<p><strong>🔄 Cấp phát & thu hồi tài sản</strong></p>
<ul>
  <li>Gửi email thông báo</li>
  <li>Đính kèm phiếu bàn giao PDF</li>
</ul>

<p><strong>📩 Xác nhận nhận tài sản</strong></p>
<ul>
  <li>Qua link email</li>
  <li>⏱️ Token hết hạn sau 30 phút</li>
</ul>

<p><strong>📷 Tra cứu thiết bị bằng QR Code</strong></p>
<ul>
  <li>Public</li>
  <li>Không cần đăng nhập</li>
</ul>

<p><strong>📊 Dashboard & thống kê</strong></p>
<ul>
  <li>Tổng số thiết bị</li>
  <li>Trạng thái sử dụng</li>
  <li>Cảnh báo bảo hành / bảo trì</li>
</ul>

<p><strong>📑 Báo cáo & export Excel</strong></p>
<ul>
  <li>Lịch sử cấp phát</li>
  <li>Báo cáo tổng hợp theo thời gian</li>
</ul>

<hr>

<h2>🏗️ 3. Kiến trúc hệ thống</h2>

<p><strong>🌐 API Backend</strong></p>
<ul>
  <li>Entry: <code>backend/src/index.js</code></li>
  <li>REST API: <code>/api/...</code></li>
</ul>

<p><strong>🗄️ Database</strong></p>
<ul>
  <li>PostgreSQL</li>
  <li>Tự động <code>sequelize.sync()</code> khi khởi động</li>
</ul>

<p><strong>📁 Lưu trữ file</strong></p>
<ul>
  <li><code>backend/uploads</code></li>
  <li>Public qua <code>/uploads/...</code></li>
</ul>

<p><strong>📩 Email</strong></p>
<ul>
  <li>Nodemailer (Gmail – App Password)</li>
</ul>

<p><strong>📄 PDF</strong></p>
<ul>
  <li>Puppeteer render template Handlebars</li>
  <li><code>backend/src/templates/*.hbs</code></li>
</ul>

<p><strong>🎨 Frontend</strong></p>
<ul>
  <li>Vite SPA</li>
  <li>Thư mục <code>frontend/</code></li>
</ul>

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
<p>📄 Tạo file: <code>backend/.env</code></p>

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
<ul>
  <li>🔑 <code>MAIL_PASS</code> phải là Gmail App Password</li>
  <li>🧠 Có <code>DATABASE_URL</code> → hệ thống ưu tiên dùng</li>
  <li>👤 Admin mặc định khi chạy lần đầu:
    <ul>
      <li>Email: <code>admin@itam.local</code></li>
      <li>Password: <code>admin123</code></li>
    </ul>
  </li>
</ul>

<hr>

<h2>🌐 4.3 Cấu hình Frontend (tuỳ chọn)</h2>

<p>📄 <code>frontend/.env</code></p>

<pre>
VITE_API_URL=http://localhost:5000/api
</pre>

<hr>

<h2>▶️ 4.4 Chạy hệ thống</h2>

<pre>
cd backend
npm run dev

cd ../frontend
npm run dev
</pre>

<p><strong>🌍 Truy cập</strong></p>
<ul>
  <li>Frontend: http://localhost:5173</li>
  <li>API: http://localhost:5000/api</li>
</ul>

<hr>

<h2>🔁 5. Các luồng nghiệp vụ chính</h2>

<p><strong>🔐 Đăng nhập</strong></p>
<ul>
  <li>POST /api/auth/login</li>
  <li>Trả về: token, user, alerts, modules</li>
</ul>

<p><strong>🖥️ Quản lý thiết bị</strong></p>
<ul>
  <li>GET /api/devices</li>
  <li>POST /api/devices</li>
  <li>PUT /api/devices/:id</li>
  <li>DELETE /api/devices/:id</li>
  <li>POST /api/devices/import</li>
  <li>GET /api/devices/metrics/counts</li>
  <li>GET /api/devices/issues/alerts</li>
</ul>

<p><strong>📦 Cấp phát tài sản</strong></p>
<ol>
  <li>IT tạo phiếu → action=issue</li>
  <li>📄 Sinh PDF + 📩 gửi email</li>
  <li>👨‍💼 Nhân viên xác nhận qua link</li>
  <li>✅ Assignment CONFIRMED, Device assigned</li>
</ol>

<p><strong>🔄 Thu hồi tài sản</strong></p>
<ul>
  <li>Tạo phiếu action=return</li>
  <li>Device → available</li>
  <li>📩 Email thông báo</li>
</ul>

<p><strong>⏱️ Token hết hạn</strong></p>
<ul>
  <li>Hết hạn sau 30 phút</li>
  <li>Trạng thái PENDING_CONFIRM</li>
  <li>🔁 Có thể resend email xác nhận</li>
</ul>

<p><strong>📷 Tra cứu QR (Public)</strong></p>
<ul>
  <li>GET /api/devices/public/:code</li>
  <li>FE route: /qr/:code</li>
</ul>

<p><strong>📊 Báo cáo & Export</strong></p>
<ul>
  <li>GET /api/assignments</li>
  <li>GET /api/assignments/export</li>
  <li>GET /api/reports/export</li>
</ul>

<hr>

<h2>🧠 6. Kịch bản sử dụng tiêu biểu</h2>

<ul>
  <li>🆕 Onboard thiết bị mới</li>
  <li>👤 Cấp phát cho nhân viên</li>
  <li>🔄 Thu hồi khi nghỉ việc / đổi thiết bị</li>
  <li>⚠️ Theo dõi bảo hành / bảo trì</li>
  <li>👥 Quản lý user (ADMIN)</li>
</ul>

<hr>

<h2>⚠️ 7. Lưu ý kỹ thuật</h2>

<ul>
  <li>⚙️ Backend dùng <code>sequelize.sync()</code> (không migration tay)</li>
  <li>📄 Puppeteer tải Chromium lần đầu (cần dung lượng)</li>
  <li>📁 <code>uploads/</code> được public</li>
  <li>🚫 Không commit <code>node_modules</code></li>
  <li>✅ Nên có <code>.env.example</code></li>
</ul>
