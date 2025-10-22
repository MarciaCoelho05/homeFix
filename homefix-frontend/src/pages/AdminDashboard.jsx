
import React from 'react';
import Layout from '../components/Layout';

const AdminDashboard = () => {
  return (
    <Layout>
      <div>
        <h2>Painel do Administrador</h2>
        <p>Gerencie os utilizadores e pedidos de manutenção aqui.</p>
        {/* Lista de pedidos, aprovação, estatísticas etc. podem ser adicionados aqui */}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
