import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
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
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Email inválido';
    if (!data.password || data.password.length < 6) errs.password = 'Senha com pelo menos 6 caracteres';
    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate({ email, password })).length === 0, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const msg = err?.response?.data?.message || 'Credenciais inválidas.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onEmail = (v) => { setEmail(v); setFieldErrors(validate({ email: v, password })); setError(''); };
  const onPassword = (v) => { setPassword(v); setFieldErrors(validate({ email, password: v })); setError(''); };

  return (
    <Layout>
      <div className="login-page">
        <h2>Entrar</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
              id="email"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              required
            />
            {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Palavra-passe</label>
            <input
              type="password"
              className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
              id="password"
              value={password}
              onChange={(e) => onPassword(e.target.value)}
              required
            />
            {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
            {submitting ? 'A entrar...' : 'Entrar'}
          </button>
          <div className="mt-2"><Link to="/forgot-password" className="btn btn-outline-primary btn-sm">Esqueci a palavra-passe</Link></div>
</form>
      </div>
    </Layout>
  );
};

export default Login;


