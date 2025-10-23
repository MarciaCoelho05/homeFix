import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';
import api from '../services/api';

const NewRequest = () => {
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', date: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = (data) => {
    const errs = {};
    if (!data.title?.trim()) errs.title = 'Indique o título';
    if (!data.description?.trim()) errs.description = 'Indique a descrição';
    if (!data.category?.trim()) errs.category = 'Selecione a categoria';
    if (data.price && isNaN(Number(data.price))) errs.price = 'Preço deve ser numérico';
    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form]);

  const handleChange = (e) => {
    const next = { ...form, [e.target.id]: e.target.value };
    setForm(next);
    setFieldErrors(validate(next));
    setStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        scheduledAt: form.date || undefined
      });
      setStatus('Pedido submetido com sucesso!');
      setForm({ title: '', description: '', category: '', price: '', date: '' });
    } catch (error) {
      const msg = error?.response?.data?.message || 'Erro ao submeter o pedido.';
      setStatus(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
            <HeroBanner title="Novo pedido de manutenção" subtitle="Descreva o serviço e agende uma data" imageUrl="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1080&auto=format&fit=crop" /><div>
        <h2>Novo Pedido de Manutenção</h2>
        {status && <div className={`alert ${status.includes('sucesso') ? 'alert-success' : 'alert-danger'} py-2`}>{status}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Título</label>
            <input type="text" className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`} id="title" value={form.title} onChange={handleChange} />
            {fieldErrors.title && <div className="invalid-feedback">{fieldErrors.title}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Descrição</label>
            <textarea className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`} id="description" value={form.description} onChange={handleChange} />
            {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="category" className="form-label">Categoria</label>
            <select className={`form-select ${fieldErrors.category ? 'is-invalid' : ''}`} id="category" value={form.category} onChange={handleChange}>
              <option value="">Selecione...</option>
              <option>Canalização</option>
              <option>Eletricidade</option>
              <option>Pintura</option>
              <option>Outro</option>
            </select>
            {fieldErrors.category && <div className="invalid-feedback">{fieldErrors.category}</div>}
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label htmlFor="price" className="form-label">Preço (opcional)</label>
              <input type="text" className={`form-control ${fieldErrors.price ? 'is-invalid' : ''}`} id="price" value={form.price} onChange={handleChange} />
              {fieldErrors.price && <div className="invalid-feedback">{fieldErrors.price}</div>}
            </div>
            <div className="col-6">
              <label htmlFor="date" className="form-label">Data para Agendamento</label>
              <input type="date" className="form-control" id="date" value={form.date} onChange={handleChange} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-3" disabled={!isValid || submitting}>
            {submitting ? 'A enviar...' : 'Submeter Pedido'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default NewRequest;

