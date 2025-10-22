
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      const role = user.isAdmin ? 'admin' : user.isTechnician ? 'technician' : 'user';
      localStorage.setItem('role', role);

      if (role === 'admin') navigate('/admin');
      else if (role === 'technician') navigate('/dashboard');
      else navigate('/profile'); // cliente vai para perfil
    } catch (err) {
      console.error(err);
      alert('Credenciais inválidas.');
    }
  };

  return (
    <Layout>
      <div className="login-page">
        <h2>Entrar</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Palavra-passe</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Entrar</button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;
