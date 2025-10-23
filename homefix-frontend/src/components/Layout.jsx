import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from './Footer';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg homefix-navbar shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">HomeFix</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              <li className="nav-item">
                <Link className="nav-link" to="/">Inicio</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/services">Servicos</Link>
              </li>
              {token && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile">Perfil</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-sm btn-primary" to="/new-request">Pedir servico</Link>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-sm btn-outline-primary" onClick={handleLogout}>Sair</button>
                  </li>
                </>
              )}
              {!token && (
                <>
                  <li className="nav-item">
                    <Link className="btn btn-sm btn-outline-primary" to="/login">Entrar</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-sm btn-primary" to="/register">Registar</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default Layout;
