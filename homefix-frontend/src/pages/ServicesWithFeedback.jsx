import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    name: 'Remodelacoes',
    image: '/img/remodelacoes.jpg',
    blurb: 'Remodelacoes completas, renovacoes parciais e melhorias personalizadas.',
  },
  {
    name: 'Jardinagem',
    image: '/img/jardinagem.webp',
    blurb: 'Manutencao de jardins, sistemas de rega e desenho de espacos verdes.',
  },
  {
    name: 'Carpintaria',
    image: '/img/carpintaria.jpeg',
    blurb: 'Mobiliario por medida, portas interiores e pavimentos.',
  },
];

const ServicesWithFeedback = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
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

  const servicesWithFeedback = useMemo(() => {
    if (!services.length) return [];
    return services
      .map((service) => {
        const feedback = service.feedback || service.latestFeedback || {};
        const rating = feedback.rating || service.feedbackRating || 5;
        const comment = feedback.comment || service.feedbackComment || 'Servico avaliado com sucesso.';
        const author = feedback.user?.firstName || service.feedbackAuthor || 'Cliente HomeFix';
        return {
          ...service,
          feedback,
          rating,
          comment,
          author,
        };
      })
      .filter((service) => service.feedback || service.comment);
  }, [services]);

  const categoryStats = useMemo(() => {
    if (!services.length) return [];
    const accumulator = new Map();
    services.forEach((service) => {
      const category = (service.category || 'Outros').trim();
      if (!accumulator.has(category)) {
        accumulator.set(category, {
          category,
          total: 0,
          priced: 0,
          sum: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
        });
      }
      const entry = accumulator.get(category);
      entry.total += 1;
      if (service.price != null) {
        const value = Number(service.price);
        if (!Number.isNaN(value)) {
          entry.priced += 1;
          entry.sum += value;
          entry.min = Math.min(entry.min, value);
          entry.max = Math.max(entry.max, value);
        }
      }
    });

    return Array.from(accumulator.values()).map((entry) => ({
      category: entry.category,
      total: entry.total,
      priced: entry.priced,
      average: entry.priced ? entry.sum / entry.priced : null,
      min: entry.priced ? entry.min : null,
      max: entry.priced ? entry.max : null,
    }));
  }, [services]);

  const sortedCategoryStats = useMemo(() => {
    const list = [...categoryStats];
    list.sort((a, b) =>
      sortAsc
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category),
    );
    return list;
  }, [categoryStats, sortAsc]);

  return (
    <Layout>
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 m-0">Categorias em destaque</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setSortAsc((prev) => !prev)}
          >
            Ordenar categorias: {sortAsc ? 'A-Z' : 'Z-A'}
          </button>
        </div>
        <div className="service-cats">
          {serviceCategories
            .slice()
            .sort((a, b) =>
              sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
            )
            .map((service) => (
              <div className="service-cat-card" key={service.name}>
                <h3 className="service-cat-title">{service.name}</h3>
                <div className="service-cat-image">
                  <img className="service-cat-img" src={service.image} alt={service.name} />
                </div>
                <p className="service-cat-text">{service.blurb}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary mt-auto"
                  onClick={() => pedirOrcamento(service.name)}
                >
                  Pedir orcamento
                </button>
              </div>
            ))}
        </div>
      </section>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 fw-semibold m-0">Tabela de precos por categoria</h2>
          <span className="text-muted small">
            Baseado nos servicos concluidos partilhados com a comunidade.
          </span>
        </div>
        {!categoryStats.length ? (
          <div className="text-muted small">Ainda nao existem valores para apresentar.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped align-middle category-price-table">
              <thead>
                <tr>
                  <th className="text-start">Categoria</th>
                  <th className="text-center">Servicos concluidos</th>
                  <th className="text-center">Com preco registado</th>
                  <th className="text-end">Preco medio</th>
                  <th className="text-end">Intervalo observado</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategoryStats.map((stat) => (
                  <tr key={stat.category}>
                    <td className="text-start fw-semibold">{stat.category}</td>
                    <td className="text-center">{stat.total}</td>
                    <td className="text-center">{stat.priced}</td>
                    <td className="text-end">
                      {stat.average != null ? `EUR ${stat.average.toFixed(2)}` : '-'}
                    </td>
                    <td className="text-end">
                      {stat.min != null && stat.max != null
                        ? `EUR ${stat.min.toFixed(2)} - EUR ${stat.max.toFixed(2)}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          {!servicesWithFeedback.length ? (
            <div className="text-center text-muted py-4">Ainda nao existe feedback publico.</div>
          ) : (
            <div className="row g-3">
              {servicesWithFeedback.map((service) => (
                <div className="col-12 col-md-6 col-lg-4" key={service.id}>
                  <div className="service-card h-100 p-3 rounded-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h2 className="h6 fw-semibold m-0">{service.title}</h2>
                      <span className="badge bg-success-subtle text-success fw-semibold">Concluido</span>
                    </div>
                    <p className="text-muted small mb-3">{service.description}</p>
                    <div className="bg-light rounded-2 p-2 mb-3">
                      <p className="small mb-1 text-dark">
                        <strong>{service.author}:</strong> "{service.comment}"
                      </p>
                      <div className="text-muted small">
                        Avaliacao: {Number(service.rating).toFixed(1)}/5
                      </div>
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
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={() => pedirOrcamento(service.category)}
                    >
                      Pedir orcamento semelhante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </Layout>
  );
};

export default ServicesWithFeedback;
