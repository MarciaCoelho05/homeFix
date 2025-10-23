import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');

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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests/mine');
        setRequests(res.data || []);
      } catch (err) {
        setRequestsError('Nao foi possivel carregar os pedidos.');
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();
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
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
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
                    Atualize os seus dados pessoais e acompanhe os seus pedidos.
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
                <div className="col-12">
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
                <div className="col-12">
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
                <div className="col-12">
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

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 p-md-5">
              <h2 className="h5 fw-semibold mb-3">Pedidos de serviço</h2>
              {requestsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">A carregar pedidos...</span>
                  </div>
                </div>
              ) : requestsError ? (
                <div className="alert alert-danger py-2">{requestsError}</div>
              ) : requests.length === 0 ? (
                <p className="text-muted small mb-0">Ainda nao submeteu pedidos de servico.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {requests.map((req) => (
                    <div key={req.id} className="border rounded-3 p-3">
                      <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                        <div>
                          <h3 className="h6 fw-semibold mb-1">{req.title}</h3>
                          <div className="small text-muted">
                            <span className="me-3"><strong>Categoria:</strong> {req.category || '-'}</span>
                            <span><strong>Status:</strong> {req.status || 'pendente'}</span>
                          </div>
                          {req.scheduledAt && (
                            <div className="small text-muted">
                              <strong>Data preferencial:</strong>{' '}
                              {new Date(req.scheduledAt).toLocaleString()}
                            </div>
                          )}
                          {req.price != null && (
                            <div className="small text-muted">
                              <strong>Preco indicado:</strong> EUR {Number(req.price).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-2 align-items-start">
                          <Link className="btn btn-sm btn-outline-primary" to={`/chat?requestId=${req.id}`}>
                            Abrir chat
                          </Link>
                        </div>
                      </div>
                      {req.mediaUrls?.length > 0 && (
                        <div className="mt-3">
                          <span className="small text-muted d-block mb-1">Anexos:</span>
                          <div className="d-flex flex-wrap gap-2">
                            {req.mediaUrls.map((url, idx) => (
                              <a
                                key={`${req.id}-media-${idx}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="badge text-bg-light text-decoration-none"
                              >
                                Ficheiro {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {req.description && (
                        <p className="small text-muted mt-2 mb-0">
                          <strong>Descricao:</strong> {req.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
