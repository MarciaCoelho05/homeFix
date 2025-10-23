import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const carouselImages = [
  { src: '/img/a1.jpg', alt: 'Trabalhos de manutenção 1' },
  { src: '/img/a2.jpg', alt: 'Trabalhos de manutenção 2' },
  { src: '/img/a3.jpg', alt: 'Trabalhos de manutenção 3' },
  { src: '/img/a4.jpg', alt: 'Trabalhos de manutenção 4' },
  { src: '/img/a5.jpg', alt: 'Trabalhos de manutenção 5' },
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
    return requests
      .map((req) => {
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
      })
      .filter((req) => req.hasFeedback);
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
                  <div className="stat-number">⭐4.8</div>
                  <div className="stat-label">Avaliacao media</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div id="homeHighlightsCarousel" className="carousel slide" data-bs-ride="carousel">
          <div className="carousel-indicators">
            {carouselImages.map((_, index) => (
              <button
                key={`indicator-${index}`}
                type="button"
                data-bs-target="#homeHighlightsCarousel"
                data-bs-slide-to={index}
                className={index === 0 ? 'active' : ''}
                aria-current={index === 0 ? 'true' : undefined}
                aria-label={`Slide ${index + 1}`}
              ></button>
            ))}
          </div>
          <div className="carousel-inner rounded-3 shadow-sm">
            {carouselImages.map((image, index) => (
              <div
                key={image.src}
                className={`carousel-item ${index === 0 ? 'active' : ''}`}
              >
                <img
                  src={image.src}
                  className="d-block w-100 home-carousel-img"
                  alt={image.alt}
                />
              </div>
            ))}
          </div>
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#homeHighlightsCarousel"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Anterior</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#homeHighlightsCarousel"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Seguinte</span>
          </button>
        </div>
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

