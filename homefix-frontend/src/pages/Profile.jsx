import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        setUser(res.data);
        setForm({ firstName: res.data.firstName || '', lastName: res.data.lastName || '', birthDate: res.data.birthDate ? res.data.birthDate.substring(0,10) : '' });
        setAvatarUrl(res.data.avatarUrl || '');
      } catch (err) {
        setStatus('Erro ao carregar perfil');
      }
    };
    fetchProfile();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/profile', { ...form, avatarUrl });
      setStatus('Perfil atualizado');
    } catch {
      setStatus('Não foi possível atualizar');
    }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarUrl(res.data.url);
      setStatus('Foto carregada');
    } catch {
      setStatus('Erro ao enviar foto');
    }
  };

  if (!user) return <Layout><p>A carregar perfil...</p></Layout>;

  return (
    <Layout>
      <div>
        <h2>Perfil</h2>
        {status && <div className="alert alert-info py-2">{status}</div>}
        <div className="d-flex align-items-center gap-3 mb-3">
          <img src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.firstName || 'U')}&background=ff7a00&color=fff&rounded=true&size=96`} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%' }} />
          <div>
            <input type="file" accept="image/*" onChange={onAvatarChange} />
          </div>
        </div>
        <form onSubmit={onSave} className="row g-2">
          <div className="col-6">
            <label className="form-label">Nome</label>
            <input className="form-control" name="firstName" value={form.firstName} onChange={onChange} />
          </div>
          <div className="col-6">
            <label className="form-label">Apelido</label>
            <input className="form-control" name="lastName" value={form.lastName} onChange={onChange} />
          </div>
          <div className="col-6">
            <label className="form-label">Data de nascimento</label>
            <input type="date" className="form-control" name="birthDate" value={form.birthDate} onChange={onChange} />
          </div>
          <div className="col-12 mt-2">
            <button className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Profile;
