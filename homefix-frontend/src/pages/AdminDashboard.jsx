import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';
import api from '../services/api';

const roleFromUser = (user) => {
  if (user.isAdmin) return 'admin';
  if (user.isTechnician) return 'technician';
  return 'user';
};

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const getUserValue = (user, key) => {
  switch (key) {
    case 'email':
      return (user.email || '').toLowerCase();
    case 'name':
      return `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    case 'role':
      return roleFromUser(user);
    case 'createdAt':
      return parseDateValue(user.createdAt);
    default:
      return null;
  }
};

const getRequestValue = (request, key) => {
  const ownerName = request.owner
    ? `${request.owner.firstName || ''} ${request.owner.lastName || ''}`.trim().toLowerCase() ||
      (request.owner.email || '').toLowerCase()
    : '';
  const technicianName = request.technician
    ? `${request.technician.firstName || ''} ${request.technician.lastName || ''}`
        .trim()
        .toLowerCase() || (request.technician.email || '').toLowerCase()
    : '';

  switch (key) {
    case 'title':
      return (request.title || '').toLowerCase();
    case 'category':
      return (request.category || '').toLowerCase();
    case 'status':
      return (request.status || '').toLowerCase();
    case 'owner':
      return ownerName;
    case 'technician':
      return technicianName;
    case 'createdAt':
      return parseDateValue(request.createdAt);
    default:
      return null;
  }
};

const getFeedbackValue = (feedback, key) => {
  const userName = feedback.user
    ? `${feedback.user.firstName || ''} ${feedback.user.lastName || ''}`.trim().toLowerCase() ||
      (feedback.user.email || '').toLowerCase()
    : '';
  switch (key) {
    case 'request':
      return (feedback.request?.title || '').toLowerCase();
    case 'user':
      return userName;
    case 'rating':
      return typeof feedback.rating === 'number' ? feedback.rating : null;
    case 'createdAt':
      return parseDateValue(feedback.createdAt);
    default:
      return null;
  }
};

const compareEntries = (valueA, valueB, direction) => {
  const dir = direction === 'asc' ? 1 : -1;
  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return -1 * dir;
  if (valueB == null) return 1 * dir;
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA === valueB ? 0 : (valueA - valueB) * dir;
  }
  const normalizedA = valueA.toString();
  const normalizedB = valueB.toString();
  if (normalizedA === normalizedB) return 0;
  return normalizedA.localeCompare(normalizedB) * dir;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [userSort, setUserSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [requestSort, setRequestSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [feedbackSort, setFeedbackSort] = useState({ key: 'createdAt', direction: 'desc' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, requestsRes, feedbacksRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/requests'),
        api.get('/admin/feedbacks'),
      ]);
      setUsers(usersRes.data || []);
      setRequests(requestsRes.data || []);
      setFeedbacks(feedbacksRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
      setError('Nao foi possivel carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (id, newRole) => {
    setStatus('');
    setError('');
    const payload =
      newRole === 'admin'
        ? { isAdmin: true, isTechnician: false }
        : newRole === 'technician'
        ? { isAdmin: false, isTechnician: true }
        : { isAdmin: false, isTechnician: false };

    try {
      const res = await api.patch(`/admin/users/${id}/role`, payload);
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...res.data } : user)));
      setStatus('Perfil atualizado com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar funcao do utilizador:', err);
      setError('Nao foi possivel atualizar o papel deste utilizador.');
    }
  };

  const handleDeleteUser = async (id) => {
    setStatus('');
    setError('');
    if (!window.confirm('Confirma que pretende eliminar este utilizador?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setStatus('Utilizador eliminado com sucesso.');
    } catch (err) {
      console.error('Erro ao eliminar utilizador:', err);
      setError(
        err?.response?.data?.message ||
          'Nao foi possivel eliminar o utilizador. Verifique se nao possui pedidos associados.',
      );
    }
  };

  const handleDeleteRequest = async (id) => {
    setStatus('');
    setError('');
    if (!window.confirm('Eliminar este pedido? Esta acao e irreversivel.')) return;
    try {
      await api.delete(`/admin/requests/${id}`);
      setRequests((prev) => prev.filter((req) => req.id !== id));
      setStatus('Pedido eliminado com sucesso.');
    } catch (err) {
      console.error('Erro ao eliminar pedido:', err);
      setError('Nao foi possivel eliminar o pedido.');
    }
  };

  const handleDeleteFeedback = async (id) => {
    setStatus('');
    setError('');
    if (!window.confirm('Eliminar este feedback?')) return;
    try {
      await api.delete(`/admin/feedbacks/${id}`);
      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
      setStatus('Feedback eliminado com sucesso.');
    } catch (err) {
      console.error('Erro ao eliminar feedback:', err);
      setError('Nao foi possivel eliminar o feedback.');
    }
  };

  const toggleSort = (currentSort, setSort, key) => {
    setSort(
      currentSort.key === key
        ? { key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  };

  const sortedUsers = useMemo(() => {
    const list = [...users];
    return list.sort((a, b) =>
      compareEntries(getUserValue(a, userSort.key), getUserValue(b, userSort.key), userSort.direction),
    );
  }, [users, userSort]);

  const sortedRequests = useMemo(() => {
    const list = [...requests];
    return list.sort((a, b) =>
      compareEntries(
        getRequestValue(a, requestSort.key),
        getRequestValue(b, requestSort.key),
        requestSort.direction,
      ),
    );
  }, [requests, requestSort]);

  const sortedFeedbacks = useMemo(() => {
    const list = [...feedbacks];
    return list.sort((a, b) =>
      compareEntries(
        getFeedbackValue(a, feedbackSort.key),
        getFeedbackValue(b, feedbackSort.key),
        feedbackSort.direction,
      ),
    );
  }, [feedbacks, feedbackSort]);

  const requestSummary = useMemo(() => {
    const total = requests.length;
    const porStatus = requests.reduce((acc, req) => {
      const statusKey = req.status || 'desconhecido';
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {});
    return { total, porStatus };
  }, [requests]);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '-';
    }
  };

  const sortLabel = (sortState, key) => {
    if (sortState.key !== key) return '';
    return sortState.direction === 'asc' ? 'ASC' : 'DESC';
  };

  return (
    <Layout>
      <HeroBanner
        title="Painel do Administrador"
        subtitle="Gestao centralizada de utilizadores, pedidos e feedbacks"
      />

      <section className="mb-4">
        {status && <div className="alert alert-success py-2">{status}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading && <div className="alert alert-info py-2">A carregar dados...</div>}
      </section>

      {!loading && (
        <>
          <section className="card border-0 shadow-sm mb-5">
            <div className="card-body">
              <h2 className="h5 fw-semibold mb-3">Utilizadores</h2>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(userSort, setUserSort, 'email')}
                        >
                          Email
                          <span className="table-sort-indicator">{sortLabel(userSort, 'email')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(userSort, setUserSort, 'name')}
                        >
                          Nome
                          <span className="table-sort-indicator">{sortLabel(userSort, 'name')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(userSort, setUserSort, 'role')}
                        >
                          Papel
                          <span className="table-sort-indicator">{sortLabel(userSort, 'role')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(userSort, setUserSort, 'createdAt')}
                        >
                          Criado em
                          <span className="table-sort-indicator">{sortLabel(userSort, 'createdAt')}</span>
                        </button>
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'}</td>
                        <td className="text-capitalize">{roleFromUser(user)}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className={`btn btn-outline-primary ${user.isAdmin ? 'active' : ''}`}
                              onClick={() => handleRoleChange(user.id, 'admin')}
                            >
                              Admin
                            </button>
                            <button
                              type="button"
                              className={`btn btn-outline-primary ${user.isTechnician ? 'active' : ''}`}
                              onClick={() => handleRoleChange(user.id, 'technician')}
                            >
                              Tecnico
                            </button>
                            <button
                              type="button"
                              className={`btn btn-outline-primary ${
                                !user.isAdmin && !user.isTechnician ? 'active' : ''
                              }`}
                              onClick={() => handleRoleChange(user.id, 'user')}
                            >
                              Cliente
                            </button>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          Nenhum utilizador registado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="card border-0 shadow-sm mb-5">
            <div className="card-body">
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-3">
                <h2 className="h5 fw-semibold m-0">Pedidos de manutencao</h2>
                <div className="small text-muted mt-2 mt-lg-0">
                  <strong>Total:</strong> {requestSummary.total}
                  {Object.entries(requestSummary.porStatus).map(([statusLabel, totalStatus]) => (
                    <span key={statusLabel} className="ms-3 text-capitalize">
                      <strong>{statusLabel}:</strong> {totalStatus}
                    </span>
                  ))}
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'title')}
                        >
                          Titulo
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'title')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'category')}
                        >
                          Categoria
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'category')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'status')}
                        >
                          Status
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'status')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'owner')}
                        >
                          Cliente
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'owner')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'technician')}
                        >
                          Tecnico
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'technician')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(requestSort, setRequestSort, 'createdAt')}
                        >
                          Data
                          <span className="table-sort-indicator">{sortLabel(requestSort, 'createdAt')}</span>
                        </button>
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.title}</td>
                        <td>{request.category}</td>
                        <td>
                          <span className="badge text-bg-light text-uppercase">
                            {request.status || 'pendente'}
                          </span>
                        </td>
                        <td>
                          {request.owner
                            ? `${request.owner.firstName || ''} ${request.owner.lastName || ''}`.trim() ||
                              request.owner.email
                            : '-'}
                        </td>
                        <td>
                          {request.technician
                            ? `${request.technician.firstName || ''} ${request.technician.lastName || ''}`.trim() ||
                              request.technician.email
                            : '-'}
                        </td>
                        <td>{formatDate(request.createdAt)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteRequest(request.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-3">
                          Nenhum pedido registado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h5 fw-semibold mb-3">Feedbacks</h2>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(feedbackSort, setFeedbackSort, 'request')}
                        >
                          Pedido
                          <span className="table-sort-indicator">{sortLabel(feedbackSort, 'request')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(feedbackSort, setFeedbackSort, 'user')}
                        >
                          Cliente
                          <span className="table-sort-indicator">{sortLabel(feedbackSort, 'user')}</span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(feedbackSort, setFeedbackSort, 'rating')}
                        >
                          Classificacao
                          <span className="table-sort-indicator">{sortLabel(feedbackSort, 'rating')}</span>
                        </button>
                      </th>
                      <th>Comentario</th>
                      <th>
                        <button
                          type="button"
                          className="table-sort-button"
                          onClick={() => toggleSort(feedbackSort, setFeedbackSort, 'createdAt')}
                        >
                          Data
                          <span className="table-sort-indicator">{sortLabel(feedbackSort, 'createdAt')}</span>
                        </button>
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFeedbacks.map((feedback) => (
                      <tr key={feedback.id}>
                        <td>{feedback.request?.title || '-'}</td>
                        <td>
                          {feedback.user
                            ? `${feedback.user.firstName || ''} ${feedback.user.lastName || ''}`.trim() ||
                              feedback.user.email
                            : '-'}
                        </td>
                        <td>{feedback.rating}/5</td>
                        <td>{feedback.comment || '-'}</td>
                        <td>{formatDate(feedback.createdAt)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedFeedbacks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-3">
                          Ainda nao existem feedbacks registados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
};

export default AdminDashboard;
