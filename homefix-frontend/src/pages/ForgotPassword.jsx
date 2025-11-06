import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailError = useMemo(() => {
    if (!email) return 'Indique o email associado a conta';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalido';
    return '';
  }, [email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError(emailError);
    if (emailError) return;

    try {
      setSubmitting(true);
      const res = await api.post('/auth/forgot', { email });
      setStatus(res.data?.message || 'Se o email existir, enviamos as instrucoes de recuperacao.');
    } catch {
      setStatus('Nao foi possivel enviar o email de recuperacao.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              <h1 className="h4 fw-semibold mb-2 text-center">Recuperar palavra-passe</h1>
              <p className="text-muted small text-center mb-4">
                Introduza o email para receber um link de redefinicao valido por 15 minutos.
              </p>
              {status && <div className="alert alert-info py-2">{status}</div>}
              <form onSubmit={handleSubmit} noValidate>
                <label className="form-label small text-uppercase">Email</label>
                <input
                  type="email"
                  name="email"
                  className={`form-control ${fieldError ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setStatus('');
                    setFieldError('');
                  }}
                  placeholder="email@exemplo.com"
                  autoComplete="email"
                  required
                />
                {fieldError && <div className="invalid-feedback">{fieldError}</div>}
                <button type="submit" className="btn btn-primary w-100 mt-4" disabled={submitting}>
                  {submitting ? 'A enviar...' : 'Enviar instrucoes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
