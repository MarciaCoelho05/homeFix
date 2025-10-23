import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Home = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/public/requests');
        setRequests(res.data || []);
      } catch (firstErr) {
        try {
          const res2 = await api.get('/public/requests?status=concluido');
          setRequests(res2.data || []);
          setError('Mostrando serviços concluídos públicos.');
        } catch (secondErr) {
          setError('Para ver todos os serviços, inicie sessão.');
        }
      }
    };
    fetchAll();
  }, []);

  return (
    <Layout>
      <section className="home-hero rounded-3 p-4 p-md-5 mb-4 text-white">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <h1 className="display-6 fw-bold mb-2">Manutenção rápida, simples e transparente</h1>
            <p className="lead mb-3">Solicite serviços de reparação e encontre técnicos de confiança. Tudo num só lugar.</p>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/login" className="btn btn-outline-primary btn-lg">Entrar</Link>
            </div>
          </div>
          <div className="col-12 col-lg-5 text-lg-end">
            <div className="stats-card p-3 rounded-3">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="stat-number">24h/7d</div>
                  <div className="stat-label">Suporte</div>
                </div>
                <div>
                  <div className="stat-number">+500</div>
                  <div className="stat-label">Serviços concluídos</div>
                </div>
                <div>
                  <div className="stat-number">4.8★</div>
                  <div className="stat-label">Avaliação média</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

            <section className="mt-4">
        <h2 className="h4 mb-3">Tipos de Serviços</h2>
        <div className="service-cats">
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop" alt="Canalização" />
            <span className="service-cat-label">Canalização</span>
          </div>
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1509395176047-4a66953fd231?q=80&w=800&auto=format&fit=crop" alt="Eletricidade" />
            <span className="service-cat-label">Eletricidade</span>
          </div>
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop" alt="Pintura" />
            <span className="service-cat-label">Pintura</span>
          </div>
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop" alt="Carpintaria" />
            <span className="service-cat-label">Carpintaria</span>
          </div>
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1484494789010-4fdb1213c8c1?q=80&w=800&auto=format&fit=crop" alt="Limpezas" />
            <span className="service-cat-label">Limpezas</span>
          </div>
          <div className="service-cat-card">
            <img className="service-cat-img" src="https://images.unsplash.com/photo-1611765083444-c2a2b1f3a26c?q=80&w=800&auto=format&fit=crop" alt="Jardinagem" />
            <span className="service-cat-label">Jardinagem</span>
          </div>
        </div>
      </section><section id="services">`r`n        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h4 m-0">Serviços recentes</h2>
          {error && <span className="text-muted small">{error}</span>}
        </div>

        {requests.length === 0 ? (
          <div className="text-center text-muted py-4">Nenhum serviço para mostrar.</div>
        ) : (
          <div className="row g-3">
            {requests.map((req) => (
              <div className="col-12 col-md-6 col-lg-4" key={req.id}>
                <div className="service-card h-100 p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h6 fw-semibold m-0">{req.title}</h3>
                    <span className={`badge status-badge status-${(req.status || 'pendente').toLowerCase()}`}>{req.status}</span>
                  </div>
                  <p className="text-muted small mb-2">{req.description}</p>
                  <div className="d-flex justify-content-between small text-muted">
                    <span><strong>Categoria:</strong> {req.category || '—'}</span>
                    {req.price != null && <span><strong>Preço:</strong> €{req.price}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Home;



