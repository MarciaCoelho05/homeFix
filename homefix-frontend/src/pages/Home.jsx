import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const serviceCategories = [
  {
    name: 'Canalizacao',
    image: '/img/canalizacao.jpg',
    blurb: 'Reparacoes de fugas, instalacao de torneiras e manutencao preventiva.',
  },
  {
    name: 'Eletricidade',
    image: '/img/eletricidade.jpg',
    blurb: 'Instalacao de iluminacao, reparacao de quadros e certificacoes.',
  },
  {
    name: 'Pintura',
    image: '/img/pintura.webp',
    blurb: 'Renovacao de interiores, fachadas e tratamento de paredes.',
  },
  {
    name: 'Carpintaria',
    image: '/img/carpintaria.jpeg',
    blurb: 'Mobiliario por medida, portas interiores e pavimentos.',
  },
  {
    name: 'Remodelacoes',
    image: '/img/remodelacoes.jpg',
    blurb: 'Remodelacoes completas, renovacoes parciais e melhorias personalizadas.',
  },
  {
    name: 'Jardinagem',
    image: '/img/jardinagem.webp',
    blurb: 'Manutencao de jardins, sistemas de rega e desenho de espacos verdes.',
  },
];

const Home = () => {
  const [requests, setRequests] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/public/requests');
        setRequests(res.data || []);
      } catch (err) {
        try {
          const resFallback = await api.get('/public/requests?status=concluido');
          setRequests(resFallback.data || []);
          setStatusMsg('Mostramos servicos concluidos recentemente.');
        } catch {
          setStatusMsg('Para ver todos os servicos, inicie sessao.');
        }
      }
    };
    fetchRequests();
  }, []);

  const pedirOrcamento = (category = '') => {
    if (!token) {
      navigate('/login');
      return;
    }
    const target = category ? `/new-request?category=${encodeURIComponent(category)}` : '/new-request';
    navigate(target);
  };

  const requestsWithFeedback = useMemo(() => {
    if (!requests.length) return [];
    return requests.map((req) => {
      const feedbackRecord = req.feedback;
      const isConcluded = (req.status || '').toLowerCase() === 'concluido';
      const hasFeedback = Boolean(feedbackRecord?.comment && isConcluded);
      return {
        ...req,
        feedbackQuote: hasFeedback ? feedbackRecord.comment : null,
        feedbackAuthor: hasFeedback ? feedbackRecord.user?.firstName || 'Cliente' : null,
        feedbackRating: hasFeedback ? feedbackRecord.rating : null,
        hasFeedback,
      };
    });
  }, [requests]);

  return (
    <Layout>
      <div className="home-page">
      <section className="home-hero rounded-3 p-4 p-md-5 mb-5 text-white">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <h1 className="display-6 fw-bold mb-3">Manutencao de qualidade, do pedido a conclusao.</h1>
            <p className="lead mb-4">
              Compare tecnicos certificados, leia feedback real e marque o servico ideal para a sua casa.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => pedirOrcamento()}>
                Pedir orcamento
              </button>
              <Link to="/services" className="btn btn-outline-light btn-lg">
                Ver servicos concluidos
              </Link>
            </div>
          </div>
          <div className="col-12 col-lg-5">
            <div className="stats-card p-4 rounded-3 bg-dark bg-opacity-25">
              <div className="d-flex justify-content-between text-center">
                <div>
                  <div className="stat-number">24h</div>
                  <div className="stat-label">Resposta media</div>
                </div>
                <div>
                  <div className="stat-number">+500</div>
                  <div className="stat-label">Servicos executados</div>
                </div>
                <div>
                  <div className="stat-number">4.8</div>
                  <div className="stat-label">Avaliacao media</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 m-0">Categorias em destaque</h2>
          <span className="text-muted small">Escolha a categoria para pedir orcamento imediato.</span>
        </div>
        <div className="service-cats">
          {serviceCategories.map((service) => (
            <div className="service-cat-card" key={service.name}>
              <h3 className="service-cat-title">{service.name}</h3>
              <div className="service-cat-image">
                <img className="service-cat-img" src={service.image} alt={service.name} />
              </div>
              <p className="service-cat-text">{service.blurb}</p>
              <button type="button" className="btn btn-sm btn-primary mt-auto" onClick={() => pedirOrcamento(service.name)}>
                Pedir orcamento
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 m-0">Servicos recentes</h2>
          {statusMsg && <span className="text-muted small">{statusMsg}</span>}
        </div>

        {!requestsWithFeedback.length ? (
          <div className="text-center text-muted py-4">Nenhum servico para mostrar de momento.</div>
        ) : (
          <div className="row g-3">
            {requestsWithFeedback.map((req) => (
              <div className="col-12 col-md-6 col-lg-4" key={req.id}>
                <div className="service-card h-100 p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h6 fw-semibold m-0">{req.title}</h3>
                    <span className={`badge status-badge status-${(req.status || 'pendente').toLowerCase()}`}>
                      {req.status || 'Pendente'}
                    </span>
                  </div>
                  <p className="text-muted small mb-3">{req.description}</p>
                  {req.hasFeedback && (
                    <div className="feedback-snippet mb-3">
                      <p className="feedback-text mb-1">
                        <strong>{req.feedbackAuthor || 'Cliente'}:</strong> "{req.feedbackQuote}"
                      </p>
                      <span className="feedback-rating text-muted small">
                        Avaliacao: {Number(req.feedbackRating || 5).toFixed(1)}/5
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">
                      <strong>Categoria:</strong> {req.category || '-'}
                    </span>
                    {req.price != null && (
                      <span className="small text-muted">
                        <strong>Preco:</strong> EUR {Number(req.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button type="button" className="btn btn-primary w-100" onClick={() => pedirOrcamento(req.category)}>
                    Obter orcamento
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="card bg-light border-0 shadow-sm">
          <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row align-items-md-center gap-4">
            <div className="flex-grow-1">
              <h2 className="h4 fw-semibold mb-2">Tecnicos validados</h2>
              <p className="text-muted mb-0">
                Cada prestador e validado pela equipa HomeFix. Garantimos orcamentos transparentes e acompanhamento ate a conclusao do trabalho.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => pedirOrcamento()}>
              Criar pedido agora
            </button>
          </div>
        </div>
      </section>
      </div>
    </Layout>
  );
};

export default Home;
