
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ServicesWithFeedback = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/requests?status=concluido');
        const concludedRequests = res.data.filter(r => r.feedback);
        setRequests(concludedRequests);
      } catch (err) {
        console.error('Erro ao carregar serviços com feedback:', err);
      }
    };

    fetchServices();
  }, []);

  return (
    <Layout>
      <div>
        <h2>Serviços Concluídos com Feedback</h2>
        {requests.length === 0 ? (
          <p>Nenhum feedback encontrado.</p>
        ) : (
          <ul className="list-group">
            {requests.map((req) => (
              <li key={req.id} className="list-group-item">
                <h5>{req.title}</h5>
                <p><strong>Categoria:</strong> {req.category}</p>
                <p><strong>Descrição:</strong> {req.description}</p>
                <p><strong>Cliente:</strong> {req.feedback.user.firstName}</p>
                <p><strong>Avaliação:</strong> ⭐ {req.feedback.rating}</p>
                {req.feedback.comment && (
                  <p><strong>Comentário:</strong> {req.feedback.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default ServicesWithFeedback;
