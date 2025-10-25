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
    blurb: 'Mobilario por medida, portas interiores e pavimentos.',
  },
];

const priceReference = {
  Canalizacao: [
    {
      service: 'Reparacao de fugas de agua',
      priceRange: '60 € – 120 €',
      travel: '40 €',
      total: '100 € – 160 €',
    },
    {
      service: 'Instalacao de torneiras',
      priceRange: '50 € – 90 €',
      travel: '40 €',
      total: '90 € – 130 €',
    },
    {
      service: 'Manutencao preventiva (tubagens, sifoes, etc.)',
      priceRange: '70 € – 140 €',
      travel: '40 €',
      total: '110 € – 180 €',
    },
  ],
  Eletricidade: [
    {
      service: 'Instalacao de iluminacao (candeeiros, focos LED)',
      priceRange: '60 € – 100 €',
      travel: '40 €',
      total: '100 € – 140 €',
    },
    {
      service: 'Reparacao de quadros eletricos',
      priceRange: '80 € – 150 €',
      travel: '40 €',
      total: '120 € – 190 €',
    },
    {
      service: 'Certificacoes eletricas',
      priceRange: '100 € – 180 €',
      travel: '40 €',
      total: '140 € – 220 €',
    },
  ],
  Pintura: [
    {
      service: 'Pintura de interiores (por divisao)',
      priceRange: '100 € – 250 €',
      travel: '40 €',
      total: '140 € – 290 €',
    },
    {
      service: 'Pintura de fachadas',
      priceRange: '300 € – 800 €',
      travel: '40 €',
      total: '340 € – 840 €',
    },
    {
      service: 'Tratamento de paredes (humidade, massa corrida, lixagem)',
      priceRange: '150 € – 400 €',
      travel: '40 €',
      total: '190 € – 440 €',
    },
  ],
  Remodelacoes: [
    {
      service: 'Remodelacao completa de cozinha ou WC',
      priceRange: '2.000 € – 8.000 €',
      travel: '40 €',
      total: '2.040 € – 8.040 €',
    },
    {
      service: 'Renovacao parcial (pavimentos, azulejos, pintura)',
      priceRange: '800 € – 2.500 €',
      travel: '40 €',
      total: '840 € – 2.540 €',
    },
    {
      service: 'Melhorias personalizadas (layout, acabamentos)',
      priceRange: '500 € – 1.500 €',
      travel: '40 €',
      total: '540 € – 1.540 €',
    },
  ],
  Jardinagem: [
    {
      service: 'Manutencao de jardim (poda, limpeza, relva)',
      priceRange: '50 € – 120 €',
      travel: '40 €',
      total: '90 € – 160 €',
    },
    {
      service: 'Instalacao de sistemas de rega',
      priceRange: '150 € – 400 €',
      travel: '40 €',
      total: '190 € – 440 €',
    },
    {
      service: 'Desenho e execucao de espacos verdes',
      priceRange: '500 € – 2.000 €',
      travel: '40 €',
      total: '540 € – 2.040 €',
    },
  ],
  Carpintaria: [
    {
      service: 'Mobilario por medida (armarios, roupeiros, etc.)',
      priceRange: '300 € – 2.000 €',
      travel: '40 €',
      total: '340 € – 2.040 €',
    },
    {
      service: 'Instalacao de portas interiores',
      priceRange: '100 € – 250 €',
      travel: '40 €',
      total: '140 € – 290 €',
    },
    {
      service: 'Colocacao de pavimentos em madeira',
      priceRange: '200 € – 600 €',
      travel: '40 €',
      total: '240 € – 640 €',
    },
  ],
};

const ServicesWithFeedback = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [priceSort, setPriceSort] = useState({ column: 'category', direction: 'asc' });
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

  const priceRows = useMemo(() => {
    const rows = Object.entries(priceReference).flatMap(([category, list]) =>
      list.map((item) => ({
        category,
        service: item.service,
        priceRange: item.priceRange,
        travel: item.travel,
        total: item.total,
      })),
    );

    rows.sort((a, b) => {
      const factor = priceSort.direction === 'asc' ? 1 : -1;
      if (priceSort.column === 'service') {
        const mergeA = `${a.category} ${a.service}`.toLowerCase();
        const mergeB = `${b.category} ${b.service}`.toLowerCase();
        return mergeA.localeCompare(mergeB) * factor;
      }
      return a.category.localeCompare(b.category) * factor;
    });

    let currentCategory = null;
    return rows.map((row) => {
      const showCategory = row.category !== currentCategory;
      currentCategory = row.category;
      return { ...row, showCategory };
    });
  }, [priceSort]);

  const togglePriceSort = (column) => {
    setPriceSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

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
              </div>
            ))}
        </div>
      </section>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 fw-semibold m-0">Tabela de precos por categoria</h2>
          <span className="text-muted small">
            Baseado em praticas de mercado e feedbacks recentes da comunidade.
          </span>
        </div>
        <div className="table-responsive category-price-wrapper shadow-sm rounded-4">
          <table className="table align-middle category-price-table table-hover mb-0">
            <thead>
              <tr>
                <th
                  className="text-start"
                  aria-sort={
                    priceSort.column === 'category'
                      ? priceSort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button type="button" className="table-sort-button" onClick={() => togglePriceSort('category')}>
                    Categoria
                    <span className="table-sort-indicator">
                      {priceSort.column === 'category' ? (priceSort.direction === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
                <th
                  className="text-start"
                  aria-sort={
                    priceSort.column === 'service'
                      ? priceSort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button type="button" className="table-sort-button" onClick={() => togglePriceSort('service')}>
                    Exemplos de servicos
                    <span className="table-sort-indicator">
                      {priceSort.column === 'service' ? (priceSort.direction === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
                <th className="text-end">Preco estimado (€)</th>
                <th className="text-end">Deslocacao (€)</th>
                <th className="text-end">Total estimado (€)</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map((row, index) => (
                <tr key={`${row.category}-${row.service}-${index}`}>
                  <td className="text-start fw-semibold text-primary-emphasis">
                    {row.showCategory ? row.category : ''}
                  </td>
                  <td className="text-start text-secondary">{row.service}</td>
                  <td className="text-end">{row.priceRange}</td>
                  <td className="text-end">{row.travel}</td>
                  <td className="text-end fw-semibold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
