
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        setUser(res.data);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      }
    };
    fetchProfile();
  }, []);

  const goToNewRequest = () => {
    navigate('/new-request');
  };

  if (!user) return <Layout><p>A carregar perfil...</p></Layout>;

  return (
    <Layout>
      <div>
        <h2>Perfil</h2>
        <p><strong>Nome:</strong> {user.firstName} {user.lastName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Tipo:</strong> {role}</p>

        {role === 'user' && (
          <button className="btn btn-primary mt-3" onClick={goToNewRequest}>
            Fazer Novo Pedido
          </button>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
