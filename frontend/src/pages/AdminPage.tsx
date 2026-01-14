import { type FormEvent, useEffect, useState } from 'react';
import api from '../utils/api';
import type { Role, User } from '../types';

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'IT_STAFF' as Role, password: 'changeme123' });

  const load = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/users', form);
    setForm({ name: '', email: '', role: 'IT_STAFF', password: 'changeme123' });
    await load();
  };

  const toggleActive = async (user: User) => {
    await api.put(`/users/${user.id}`, { active: !user.active });
    await load();
  };

  const updateRole = async (user: User, role: Role) => {
    await api.put(`/users/${user.id}`, { role });
    await load();
  };

  return (
    <div className="container-fluid">
      <div className="card-ghost mb-3">
        <h5 className="mb-3">Nhân viên IT</h5>
        <div className="table-responsive">
          <table className="table table-dark align-middle">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Email</th>
                <th>Role</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select className="form-select form-select-sm" value={u.role} onChange={(e) => updateRole(u, e.target.value as Role)}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="IT_STAFF">IT_STAFF</option>
                    </select>
                  </td>
                  <td>{u.active ? <span className="badge bg-success">Hoạt động</span> : <span className="badge bg-secondary">Đã khóa</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-light" onClick={() => toggleActive(u)}>
                      {u.active ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-ghost">
        <h5 className="mb-3">Thêm người dùng</h5>
        <form className="row g-3" onSubmit={submit}>
          <div className="col-md-4">
            <label className="form-label">Tên</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Email</label>
            <input className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="IT_STAFF">IT_STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Mật khẩu</label>
            <input className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="col-12 d-flex justify-content-end">
            <button className="btn btn-primary">Tạo mới</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
