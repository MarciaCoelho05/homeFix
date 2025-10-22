
import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.css'; // Estilos específicos, caso necessário

const Layout = ({ children }) => {
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">HomeFix</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">Início</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Serviços</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Entrar</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">Registar</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="container mt-4">
        {children}
      </main>
    </>
  );
};

export default Layout;
