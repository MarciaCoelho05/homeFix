import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const categories = [
  'Canalização',
  'Eletricidade',
  'Pintura',
  'Remodelações',
  'Jardinagem',
  'Outro',
];

const NewRequest = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    date: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);

  const MAX_FILES = 5;

  const validate = (data) => {
    const errs = {};
    if (!data.title?.trim()) errs.title = 'Indique o título';
    if (!data.description?.trim()) errs.description = 'Indique a descrição';
    if (!data.category?.trim()) errs.category = 'Selecione a categoria';
    if (data.price && Number.isNaN(Number(data.price))) errs.price = 'Preço deve ser numérico';
    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form]);

  const handleChange = (event) => {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    setFieldErrors(validate(next));
    setStatus('');
  };

  const handleMediaChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    if (files.length + media.length > MAX_FILES) {
      setStatus(`Pode anexar até ${MAX_FILES} ficheiros.`);
      return;
    }

    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push({
          url: response.data.url,
          type: file.type.startsWith('video') ? 'video' : 'image',
        });
      }
      setMedia((prev) => [...prev, ...uploaded]);
      setStatus('');
    } catch (err) {
      setStatus('Erro ao enviar ficheiros. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = (url) => {
    setMedia((prev) => prev.filter((item) => item.url !== url));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setSubmitting(true);
      await api.post('/requests', {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price ? Number(form.price) : undefined,
        scheduledAt: form.date || undefined,
        mediaUrls: media.map((item) => item.url),
      });
      setStatus('Pedido submetido com sucesso!');
      setForm({ title: '', description: '', category: '', price: '', date: '' });
      setMedia([]);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Erro ao submeter o pedido.';
      setStatus(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="request-hero rounded-3 p-4 p-md-5 mb-4 text-white">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <h1 className="display-6 fw-semibold mb-2 text-white">Novo pedido de manutenção</h1>
            <p className="lead mb-0">
              Descreva o serviço que precisa, escolha a categoria e indique uma data preferencial. A equipa certa entra em contacto.
            </p>
          </div>
          <div className="col-12 col-lg-5 text-lg-end">
            <img className="request-hero-img" src="/img/remodelacoes.jpg" alt="Profissional a trabalhar" />
          </div>
        </div>
      </section>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <h2 className="h4 fw-semibold mb-3">Detalhes do pedido</h2>
          {status && (
            <div className={`alert ${status.includes('sucesso') ? 'alert-success' : 'alert-danger'} py-2`}>
              {status}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="request-form">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="title">Título</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ex.: Revisão da instalação elétrica"
                />
                {fieldErrors.title && <div className="invalid-feedback">{fieldErrors.title}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="category">Categoria</label>
                <select
                  id="category"
                  name="category"
                  className={`form-select ${fieldErrors.category ? 'is-invalid' : ''}`}
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  {categories.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.category && <div className="invalid-feedback">{fieldErrors.category}</div>}
              </div>
              <div className="col-12">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Indique detalhes relevantes (medidas, sintomas, urgência...)."
                />
                {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="price">Preço estimado (opcional)</label>
                <input
                  id="price"
                  name="price"
                  type="text"
                  className={`form-control ${fieldErrors.price ? 'is-invalid' : ''}`}
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Ex.: 150"
                />
                {fieldErrors.price && <div className="invalid-feedback">{fieldErrors.price}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="date">Data preferencial</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  className="form-control"
                  value={form.date}
                  onChange={handleChange}
                />
              </div>
              <div className="col-12">
                <label className="form-label text-uppercase small fw-semibold" htmlFor="media">Anexos (imagens ou vídeos)</label>
                <input
                  id="media"
                  name="media"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="form-control"
                  onChange={handleMediaChange}
                />
                <small className="text-muted d-block mt-1">Pode anexar até {MAX_FILES} ficheiros.</small>
                {uploading && <div className="small text-muted mt-2">A carregar ficheiros...</div>}
                {media.length > 0 && (
                  <div className="media-preview-grid mt-3">
                    {media.map((item) => (
                      <div className="media-preview-item" key={item.url}>
                        {item.type === 'video' ? (
                          <video src={item.url} controls />
                        ) : (
                          <img src={item.url} alt="Anexo" />
                        )}
                        <button type="button" className="btn btn-link btn-sm text-danger px-0" onClick={() => handleRemoveMedia(item.url)}>
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4" disabled={!isValid || submitting || uploading}>
              {submitting ? 'A enviar...' : 'Submeter pedido'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default NewRequest;
