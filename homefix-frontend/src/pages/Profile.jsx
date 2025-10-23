import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');

  const dateBounds = useMemo(() => {
    const today = new Date();
    const min = new Date(today);
    min.setFullYear(today.getFullYear() - 100);
    const max = new Date(today);
    max.setFullYear(today.getFullYear() - 18);
    return {
      min: formatDateInput(min),
      max: formatDateInput(max),
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        const data = res.data || {};
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
        });
        setAvatarUrl(data.avatarUrl || '');
      } catch (err) {
        setStatus('Nao foi possivel carregar o perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const validate = (payload) => {
    const errors = {};
    if (!payload.firstName.trim()) errors.firstName = 'Indique o nome';
    if (!payload.lastName.trim()) errors.lastName = 'Indique o apelido';

    if (!payload.birthDate) {
      errors.birthDate = 'Indique a data de nascimento';
    } else {
      const birth = new Date(payload.birthDate);
      if (Number.isNaN(birth.getTime())) {
        errors.birthDate = 'Data invalida';
      } else {
        const min = new Date(dateBounds.min);
        const max = new Date(dateBounds.max);
        if (birth < min || birth > max) {
          errors.birthDate = 'Idade deve estar entre 18 e 100 anos';
        }
      }
    }

    return errors;
  };

  const handleChange = (event) => {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    setFieldErrors({});
    setStatus('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      await api.patch('/profile', { ...form, avatarUrl });
      setStatus('Perfil atualizado com sucesso');
    } catch {
      setStatus('Nao foi possivel atualizar o perfil');
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.url);
      setStatus('Fotografia atualizada');
    } catch {
      setStatus('Erro ao enviar fotografia');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">A carregar...</span>
          </div>
        </div>
      </Layout>
    );
  }

  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    form.firstName || 'U',
  )}&background=ff7a00&color=fff&rounded=true&size=120`;

  return (
    <Layout>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4 mb-4">
                <img
                  src={avatarUrl || avatarFallback}
                  alt="Avatar"
                  className="rounded-circle border"
                  style={{ width: 104, height: 104, objectFit: 'cover' }}
                />
                <div className="text-center text-md-start">
                  <h1 className="h4 fw-semibold mb-1">O seu perfil</h1>
                  <p className="text-muted small mb-3">
                    Atualize os seus dados pessoais e fotografia.
                  </p>
                  <label className="btn btn-outline-secondary btn-sm mb-0">
                    Alterar fotografia
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {status && <div className="alert alert-info py-2">{status}</div>}

              <form className="row g-3" onSubmit={handleSave} noValidate>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-uppercase">Nome</label>
                  <input
                    name="firstName"
                    className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`}
                    value={form.firstName}
                    onChange={handleChange}
                  />
                  {fieldErrors.firstName && (
                    <div className="invalid-feedback">{fieldErrors.firstName}</div>
                  )}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-uppercase">Apelido</label>
                  <input
                    name="lastName"
                    className={`form-control ${fieldErrors.lastName ? 'is-invalid' : ''}`}
                    value={form.lastName}
                    onChange={handleChange}
                  />
                  {fieldErrors.lastName && (
                    <div className="invalid-feedback">{fieldErrors.lastName}</div>
                  )}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-uppercase">Data de nascimento</label>
                  <input
                    type="date"
                    name="birthDate"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    className={`form-control ${fieldErrors.birthDate ? 'is-invalid' : ''}`}
                    value={form.birthDate}
                    onChange={handleChange}
                  />
                  {fieldErrors.birthDate && (
                    <div className="invalid-feedback">{fieldErrors.birthDate}</div>
                  )}
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary px-4">
                    Guardar alteracoes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
