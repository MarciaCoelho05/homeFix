import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const validate = (data) => {
    const errs = {};
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Email invalido';
    if (!data.password || data.password.length < 6) errs.password = 'Senha com pelo menos 6 caracteres';
    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate({ email, password })).length === 0, [email, password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate({ email, password });
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setSubmitting(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      const role = user.isAdmin ? 'admin' : user.isTechnician ? 'technician' : 'user';
      localStorage.setItem('role', role);

      if (role === 'admin') navigate('/admin');
      else if (role === 'technician') navigate('/dashboard');
      else navigate('/profile');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Credenciais invalidas.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateEmail = (value) => {
    setEmail(value);
    setFieldErrors(validate({ email: value, password }));
    setError('');
  };

  const updatePassword = (value) => {
    setPassword(value);
    setFieldErrors(validate({ email, password: value }));
    setError('');
  };

  return (
    <Layout>
      <div className="auth-wrapper">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0 auth-card">
            <div className="card-body p-4 p-md-5">
              <h1 className="h4 fw-semibold mb-3 text-center">Entrar</h1>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label small text-uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                    id="email"
                    value={email}
                    onChange={(event) => updateEmail(event.target.value)}
                    required
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label small text-uppercase">
                    Palavra-passe
                  </label>
                  <input
                    type="password"
                    className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                    id="password"
                    value={password}
                    onChange={(event) => updatePassword(event.target.value)}
                    required
                  />
                  {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={!isValid || submitting}>
                  {submitting ? 'A entrar...' : 'Entrar'}
                </button>
                <div className="mt-3 text-center">
                  <Link to="/forgot-password" className="btn btn-outline-primary btn-sm">
                    Esqueci a palavra-passe
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
