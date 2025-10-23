import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const ServicesWithFeedback = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/public/requests?status=concluido');
        setServices(res.data || []);
      } catch {
        setError('Nao foi possivel carregar os servicos.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const pedirOrcamento = (category = '') => {
    if (!token) {
      navigate('/login');
      return;
    }
    const target = category ? `/new-request?category=${encodeURIComponent(category)}` : '/new-request';
    navigate(target);
  };

  return (
    <Layout>
      <section className="mb-5">
        <div className="rounded-3 p-4 p-md-5 home-hero text-white">
          <h1 className="display-6 fw-bold mb-2">Servicos concluidos com feedback real</h1>
          <p className="lead mb-0">
            Inspire-se em pedidos finalizados recentemente e faca o seu pedido com a mesma equipa.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">A carregar...</span>
          </div>
        </div>
      ) : (
        <section>
          {error && <div className="alert alert-danger">{error}</div>}
          {!services.length ? (
            <div className="text-center text-muted py-4">Ainda nao existe feedback publico.</div>
          ) : (
            <div className="row g-3">
              {services.map((service) => {
                const feedback = service.feedback || service.latestFeedback || {};
                const rating = feedback.rating || service.feedbackRating || 5;
                const comment = feedback.comment || service.feedbackComment || 'Servico avaliado com sucesso.';
                const author = feedback.user?.firstName || service.feedbackAuthor || 'Cliente HomeFix';

                return (
                  <div className="col-12 col-md-6 col-lg-4" key={service.id}>
                    <div className="service-card h-100 p-3 rounded-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h2 className="h6 fw-semibold m-0">{service.title}</h2>
                        <span className="badge bg-success-subtle text-success fw-semibold">Concluido</span>
                      </div>
                      <p className="text-muted small mb-3">{service.description}</p>
                      <div className="bg-light rounded-2 p-2 mb-3">
                        <p className="small mb-1 text-dark">
                          <strong>{author}:</strong> "{comment}"
                        </p>
                        <div className="text-muted small">Avaliacao: {Number(rating).toFixed(1)}/5</div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">
                          <strong>Categoria:</strong> {service.category || '-'}
                        </span>
                        {service.price != null && (
                          <span className="small text-muted">
                            <strong>Preco:</strong> EUR {Number(service.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button type="button" className="btn btn-primary w-100" onClick={() => pedirOrcamento(service.category)}>
                        Pedir orcamento semelhante
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </Layout>
  );
};

export default ServicesWithFeedback;
