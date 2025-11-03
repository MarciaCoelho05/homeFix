import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const technicianCategories = [
  'Canalizacao',
  'Eletricidade',
  'Pintura',
  'Remodelacoes',
  'Jardinagem',
  'Carpintaria',
  'Outro',
];

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isTechnician = role === 'technician';
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nif: '',
    birthDate: '',
    technicianCategory: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState('');

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
          nif: data.nif || '',
          birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
          technicianCategory: data.technicianCategory || '',
        });
        setAvatarUrl(data.avatarUrl || '');
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setStatus('Nao foi possivel carregar o perfil.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isAdmin || isTechnician) {
      setRequestsLoading(false);
      return;
    }
    setRequestsLoading(false);
  }, [isAdmin, isTechnician]);

  const validate = (payload) => {
    const errors = {};
    if (!payload.firstName.trim()) errors.firstName = 'Indique o nome';
    if (!payload.lastName.trim()) errors.lastName = 'Indique o apelido';
    
    if (payload.nif && payload.nif.trim() && !/^\d{9}$/.test(payload.nif.trim())) {
      errors.nif = 'NIF deve ter 9 dígitos';
    }

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

    if (isTechnician && !(payload.technicianCategory || '').trim()) {
      errors.technicianCategory = 'Selecione a sua categoria';
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
    } catch (err) {
      console.error('Erro ao guardar perfil:', err);
      setStatus('Nao foi possivel atualizar o perfil');
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.url);
      setStatus('Fotografia atualizada');
    } catch (err) {
      console.error('Erro ao carregar avatar:', err);
      setStatus('Erro ao enviar fotografia');
    }
  };

  const downloadBlob = (data, fileName) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const extractFileName = (disposition, fallback) => {
    if (typeof disposition !== 'string') return fallback;
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return match && match[1] ? match[1] : fallback;
  };

  const handleDownloadInvoice = async (requestId) => {
    setDownloadingInvoiceId(requestId);
    try {
      const response = await api.get(`/requests/${requestId}/invoice`, { responseType: 'blob' });
      const fileName = extractFileName(response.headers['content-disposition'], `fatura-${requestId}.pdf`);
      downloadBlob(response.data, fileName);
      setStatus('Fatura descarregada com sucesso.');
    } catch (err) {
      console.error('Erro ao descarregar fatura:', err);
      setStatus(err?.response?.data?.message || 'Nao foi possivel descarregar a fatura.');
    } finally {
      setDownloadingInvoiceId('');
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Eliminar este pedido? Esta acao e irreversivel.')) return;
    setDeletingRequestId(requestId);
    setStatus('');
    setRequestsError('');
    try {
      await api.delete(`/requests/${requestId}`);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setStatus('Pedido eliminado com sucesso.');
    } catch (err) {
      console.error('Erro ao eliminar pedido:', err);
      setStatus(err?.response?.data?.message || 'Nao foi possivel eliminar o pedido.');
    } finally {
      setDeletingRequestId('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Tem a certeza de que pretende eliminar a conta?')) return;
    setDeletingAccount(true);
    setStatus('');
    try {
      await api.delete('/profile');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erro ao eliminar conta:', err);
      setStatus(err?.response?.data?.message || 'Nao foi possivel eliminar a conta.');
    } finally {
      setDeletingAccount(false);
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
                    Atualize os seus dados pessoais e mantenha a seguranca da conta.
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
                  <label className="form-label small text-uppercase">NIF (Opcional)</label>
                  <input
                    name="nif"
                    type="text"
                    maxLength="9"
                    placeholder="000000000"
                    className={`form-control ${fieldErrors.nif ? 'is-invalid' : ''}`}
                    value={form.nif}
                    onChange={handleChange}
                  />
                  {fieldErrors.nif && (
                    <div className="invalid-feedback">{fieldErrors.nif}</div>
                  )}
                  <small className="text-muted">Necessário para fatura com IVA</small>
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
                {isTechnician && (
                  <div className="col-12">
                    <label className="form-label small text-uppercase">Categoria de especializacao</label>
                    <select
                      name="technicianCategory"
                      className={`form-select ${fieldErrors.technicianCategory ? 'is-invalid' : ''}`}
                      value={form.technicianCategory}
                      onChange={handleChange}
                    >
                      <option value="">Selecione...</option>
                      {technicianCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.technicianCategory && (
                      <div className="invalid-feedback">{fieldErrors.technicianCategory}</div>
                    )}
                  </div>
                )}
                <div className="col-12">
                  <button type="submit" className="btn btn-primary px-4">
                    Guardar alteracoes
                  </button>
                </div>
              </form>

              <hr className="my-4" />

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'A eliminar conta...' : 'Eliminar conta'}
              </button>
            </div>
          </div>
        </div>

        {/* Removido: seção de pedidos de serviço */}
      </div>
    </Layout>
  );
};

export default Profile;
