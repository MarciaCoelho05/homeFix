
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';
import api from '../services/api';

const Dashboard = () => {
  const [requests, setRequests] = useState([]);
  const role = localStorage.getItem('role');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const endpoint = role === 'technician' || role === 'admin' ? '/requests' : '/requests/mine';
        const res = await api.get(endpoint);
        setRequests(res.data);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
      }
    };

    fetchRequests();
  }, [role]);

  return (
    <Layout>
            <HeroBanner title="Os meus pedidos" subtitle="Acompanhe o estado e detalhes de todos os pedidos" imageUrl="https://images.unsplash.com/photo-1581091012184-7c54c02b4c47?q=80&w=1080&auto=format&fit=crop" /><div>
        <h2>Meus Pedidos</h2>
        {requests.length === 0 ? (
          <p>Nenhum pedido encontrado.</p>
        ) : (
          <ul className="list-group">
            {requests.map((req) => (
              <li key={req.id} className="list-group-item">
                <h5>{req.title}</h5>
                <p><strong>Status:</strong> {req.status}</p>
                <p><strong>Categoria:</strong> {req.category}</p>
                <p><strong>Data:</strong> {new Date(req.scheduledAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;

