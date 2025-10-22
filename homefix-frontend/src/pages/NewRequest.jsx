
import React, { useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const NewRequest = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    date: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', {
        title: form.title,
        description: form.description,
        category: form.category,
        scheduledAt: form.date
      });
      alert("Pedido submetido com sucesso!");
      setForm({ title: '', description: '', category: '', date: '' });
    } catch (error) {
      console.error(error);
      alert("Erro ao submeter o pedido.");
    }
  };

  return (
    <Layout>
      <div>
        <h2>Novo Pedido de Manutenção</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Título</label>
            <input type="text" className="form-control" id="title" value={form.title} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Descrição</label>
            <textarea className="form-control" id="description" value={form.description} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label htmlFor="category" className="form-label">Categoria</label>
            <select className="form-select" id="category" value={form.category} onChange={handleChange} required>
              <option value="">Selecione...</option>
              <option>Canalização</option>
              <option>Eletricidade</option>
              <option>Pintura</option>
              <option>Outro</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="date" className="form-label">Data para Agendamento</label>
            <input type="date" className="form-control" id="date" value={form.date} onChange={handleChange} />
          </div>
          <button type="submit" className="btn btn-success">Submeter Pedido</button>
        </form>
      </div>
    </Layout>
  );
};

export default NewRequest;
