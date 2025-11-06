import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Schedule() {
  const [datetime, setDatetime] = useState('');
  const [status, setStatus] = useState('');
  const [requestId] = useState('ID_DO_PEDIDO');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/maintenance-requests/${requestId}/schedule`, { datetime });
      setStatus('Agendamento enviado com sucesso!');
      setDatetime('');
    } catch (err) {
      console.error('Erro ao agendar:', err);
      setStatus('Erro ao enviar agendamento.');
    }
  };

  return (
    <Layout>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 fw-semibold mb-3">Agendar Manutenção</h2>
              {status && <div className={`alert ${status.includes('sucesso') ? 'alert-success' : 'alert-danger'} py-2 mb-3`}>{status}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small text-uppercase">Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Enviar Agendamento
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
