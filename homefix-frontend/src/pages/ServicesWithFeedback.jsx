import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSearch } from '../contexts/SearchContext';
import api from '../services/api';

const serviceCategories = [
  {
    name: 'Canalização',
    image: '/img/canalizacao.jpg',
    blurb: 'Reparações de fugas, instalação de torneiras e manutenção preventiva.',
  },
  {
    name: 'Eletricidade',
    image: '/img/eletricidade.jpg',
    blurb: 'Instalação de iluminação, reparação de quadros e certificações.',
  },
  {
    name: 'Pintura',
    image: '/img/pintura.webp',
    blurb: 'Renovação de interiores, fachadas e tratamento de paredes.',
  },
  {
    name: 'Remodelações',
    image: '/img/remodelacoes.jpg',
    blurb: 'Remodelações completas, renovações parciais e melhorias personalizadas.',
  },
  {
    name: 'Jardinagem',
    image: '/img/jardinagem.webp',
    blurb: 'Manutenção de jardins, sistemas de rega e desenho de espaços verdes.',
  },
  {
    name: 'Carpintaria',
    image: '/img/carpintaria.jpeg',
    blurb: 'Mobiliário por medida, portas interiores e pavimentos.',
  },
];

const priceReference = {
  Canalização: [
    {
      service: 'Reparação de fugas de água',
      priceRange: '60 € – 120 €',
      travel: '40 €',
      total: '100 € – 160 €',
    },
    {
      service: 'Instalação de torneiras',
      priceRange: '50 € – 90 €',
      travel: '40 €',
      total: '90 € – 130 €',
    },
    {
      service: 'Manutenção preventiva (tubagens, sifões, etc.)',
      priceRange: '70 € – 140 €',
      travel: '40 €',
      total: '110 € – 180 €',
    },
  ],
  Eletricidade: [
    {
      service: 'Instalação de iluminação (candeeiros, focos LED)',
      priceRange: '60 € – 100 €',
      travel: '40 €',
      total: '100 € – 140 €',
    },
    {
      service: 'Reparação de quadros elétricos',
      priceRange: '80 € – 150 €',
      travel: '40 €',
      total: '120 € – 190 €',
    },
    {
      service: 'Certificações elétricas',
      priceRange: '100 € – 180 €',
      travel: '40 €',
      total: '140 € – 220 €',
    },
  ],
  Pintura: [
    {
      service: 'Pintura de interiores (por divisão)',
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
  Remodelações: [
    {
      service: 'Remodelação completa de cozinha ou WC',
      priceRange: '2.000 € – 8.000 €',
      travel: '40 €',
      total: '2.040 € – 8.040 €',
    },
    {
      service: 'Renovação parcial (pavimentos, azulejos, pintura)',
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
      service: 'Manutenção de jardim (poda, limpeza, relva)',
      priceRange: '50 € – 120 €',
      travel: '40 €',
      total: '90 € – 160 €',
    },
    {
      service: 'Instalação de sistemas de rega',
      priceRange: '150 € – 400 €',
      travel: '40 €',
      total: '190 € – 440 €',
    },
    {
      service: 'Desenho e execução de espaços verdes',
      priceRange: '500 € – 2.000 €',
      travel: '40 €',
      total: '540 € – 2.040 €',
    },
  ],
  Carpintaria: [
    {
      service: 'Mobiliário por medida (armários, roupeiros, etc.)',
      priceRange: '300 € – 2.000 €',
      travel: '40 €',
      total: '340 € – 2.040 €',
    },
    {
      service: 'Instalação de portas interiores',
      priceRange: '100 € – 250 €',
      travel: '40 €',
      total: '140 € – 290 €',
    },
    {
      service: 'Colocação de pavimentos em madeira',
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
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const feedbackSectionRef = useRef(null);
  const categoriesSectionRef = useRef(null);
  const tableSectionRef = useRef(null);

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
    const query = searchQuery.toLowerCase().trim();
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
      .filter((service) => {
        // Excluir feedback específico: "Reparação de fuga" com descrição "Fuga no lavatório da cozinha"
        const title = (service.title || '').toLowerCase().trim();
        const description = (service.description || '').toLowerCase().trim();
        if (
          (title.includes('reparação de fuga') || title === 'reparação de fuga') &&
          (description.includes('fuga no lavatório da cozinha') || description === 'fuga no lavatório da cozinha')
        ) {
          return false;
        }
        
        if (!service.feedback && !service.comment) return false;
        if (!query) return true;
        const searchableText = [
          service.category,
          service.comment,
          service.author,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(query);
      });
  }, [services, searchQuery]);

  const priceRows = useMemo(() => {
    let rows = Object.entries(priceReference).flatMap(([category, list]) =>
      list.map((item) => ({
        category,
        service: item.service,
        priceRange: item.priceRange,
        travel: item.travel,
        total: item.total,
      })),
    );

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      rows = rows.filter(row => 
        row.category.toLowerCase().includes(query) || 
        row.service.toLowerCase().includes(query)
      );
    }

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
    let isFirstMatch = true;
    return rows.map((row) => {
      const showCategory = row.category !== currentCategory;
      currentCategory = row.category;
      const firstMatch = isFirstMatch && query;
      if (firstMatch) isFirstMatch = false;
      return { ...row, showCategory, firstMatch };
    });
  }, [priceSort, searchQuery]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return serviceCategories.map(cat => ({ ...cat, firstMatch: false }));
    let isFirst = true;
    const filtered = serviceCategories.filter(cat => 
      cat.name.toLowerCase().includes(query) || 
      cat.blurb.toLowerCase().includes(query)
    ).map(cat => {
      const firstMatch = isFirst;
      if (firstMatch) isFirst = false;
      return { ...cat, firstMatch };
    });
    return filtered;
  }, [searchQuery]);

  const togglePriceSort = (column) => {
    setPriceSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return;

    setTimeout(() => {
      const firstCategoryMatch = document.querySelector('[data-first-match="true"]');
      if (firstCategoryMatch) {
        firstCategoryMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (filteredCategories.length > 0 && categoriesSectionRef.current) {
        categoriesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (priceRows.length > 0 && tableSectionRef.current) {
        tableSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (servicesWithFeedback.length > 0 && feedbackSectionRef.current) {
        feedbackSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, [searchQuery, filteredCategories.length, priceRows.length, servicesWithFeedback.length]);

  return (
    <Layout>
      <section className="mb-5" ref={categoriesSectionRef}>
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
          {filteredCategories
            .slice()
            .sort((a, b) =>
              sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
            )
            .map((service) => (
              <div className="service-cat-card" key={service.name} data-first-match={service.firstMatch}>
                <h3 className="service-cat-title">{service.name}</h3>
                <div className="service-cat-image">
                  <img className="service-cat-img" src={service.image} alt={service.name} />
                </div>
                <p className="service-cat-text">{service.blurb}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="mb-5" ref={tableSectionRef}>
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
                <tr key={`${row.category}-${row.service}-${index}`} data-first-match={row.firstMatch}>
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
        <section ref={feedbackSectionRef}>
          {error && <div className="alert alert-danger">{error}</div>}
          {!servicesWithFeedback.length ? (
            <div className="text-center text-muted py-4">Ainda nao existe feedback publico.</div>
          ) : (
            <>
              <h3 className="h5 fw-semibold mb-3">Feedback de clientes</h3>
              {searchQuery && (
                <p className="text-muted small mb-3">
                  {servicesWithFeedback.length === 0
                    ? 'Nenhum resultado encontrado.'
                    : `${servicesWithFeedback.length} resultado(s) encontrado(s).`}
                </p>
              )}
              <div className="row g-3">
                {servicesWithFeedback.map((service) => (
                <div className="col-12 col-md-6 col-lg-4" key={service.id}>
                  <div className="service-card h-100 p-3 rounded-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-success-subtle text-success fw-semibold">Concluido</span>
                    </div>
                    <div className="bg-light rounded-2 p-2 mb-3">
                      <p className="small mb-1 text-dark">
                        <strong>{service.author}:</strong> "{service.comment}"
                      </p>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-warning" style={{ fontSize: '1.1rem' }}>
                          {'★'.repeat(Math.floor(service.rating))}
                          {'☆'.repeat(5 - Math.floor(service.rating))}
                        </span>
                        <span className="text-muted small">
                          {Number(service.rating).toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">
                        <strong>Categoria:</strong> {service.category || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </section>
      )}
    </Layout>
  );
};

export default ServicesWithFeedback;
