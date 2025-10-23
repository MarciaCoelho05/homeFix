import React from 'react';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';

const AdminDashboard = () => {
  return (
    <Layout>
            <HeroBanner title="Painel do Administrador" subtitle="Gestão de utilizadores e pedidos" imageUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Tools.jpg/640px-Tools.jpg" /><div>
        <h2>Painel do Administrador</h2>
        <p>Gerencie os utilizadores e pedidos de manutenção aqui.</p>
        {/* Lista de pedidos, aprovação, estatísticas etc. podem ser adicionados aqui */}
      </div>
    </Layout>
  );
};

export default AdminDashboard;

