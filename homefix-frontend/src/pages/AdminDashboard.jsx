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
  
  // Chat de suporte
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatContent, setChatContent] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRequests, setChatRequests] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

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
      
      // Carregar pedidos para chat - apenas pedidos de suporte
      const chatRequestsRes = await api.get('/requests');
      const chatRequestsList = chatRequestsRes.data || [];
      // Filtrar apenas pedidos de suporte
      const supportRequests = chatRequestsList.filter(req => 
        req.title?.toLowerCase().includes('chat de suporte') || 
        req.title?.toLowerCase().includes('suporte') || 
        req.title?.toLowerCase().includes('apoio') ||
        req.category?.toLowerCase() === 'suporte'
      );
      // Filtrar apenas pedidos com mensagens
      const requestsWithMessages = await Promise.all(
        supportRequests.map(async (req) => {
          try {
            const messagesRes = await api.get(`/messages/${req.id}`);
            const messages = messagesRes.data || [];
            // Filtrar apenas mensagens enviadas para o suporte (não do admin)
            const supportMessages = messages.filter(msg => !msg.sender?.isAdmin);
            return {
              ...req,
              messageCount: supportMessages.length,
              hasMessages: supportMessages.length > 0,
              supportMessages: supportMessages,
            };
          } catch {
            return { ...req, messageCount: 0, hasMessages: false, supportMessages: [] };
          }
        })
      );
      setChatRequests(requestsWithMessages.filter(req => req.hasMessages));
      if (requestsWithMessages.filter(req => req.hasMessages).length > 0 && !selectedRequestId) {
        const firstWithMessages = requestsWithMessages.find(req => req.hasMessages);
        if (firstWithMessages) {
          setSelectedRequestId(firstWithMessages.id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
      setError('Nao foi possivel carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchMessages = useCallback(async (requestId) => {
    if (!requestId) {
      setMessages([]);
      return;
    }
    setChatLoading(true);
    try {
      const res = await api.get(`/messages/${requestId}`);
      const allMessages = res.data || [];
      // Filtrar apenas mensagens enviadas para o suporte (não do admin)
      const supportMessages = allMessages.filter(msg => !msg.sender?.isAdmin);
      setMessages(supportMessages);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (selectedRequestId) {
      fetchMessages(selectedRequestId);
    }
  }, [selectedRequestId, fetchMessages]);
  
  const handleSendMessage = async () => {
    if (!selectedRequestId || (!chatContent.trim() && pendingAttachments.length === 0)) return;
    
    try {
      await api.post('/messages', {
        requestId: selectedRequestId,
        content: chatContent.trim(),
        attachments: pendingAttachments.map((item) => item.url),
      });
      setChatContent('');
      setPendingAttachments([]);
      fetchMessages(selectedRequestId);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Não foi possível enviar a mensagem.');
    }
  };
  
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    
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
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Erro ao carregar anexos:', err);
      setError('Não foi possível carregar os anexos.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemoveAttachment = (url) => {
    setPendingAttachments((prev) => prev.filter((item) => item.url !== url));
  };
  
  const isVideo = (url = '') => {
    const value = url.toLowerCase();
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some((ext) => value.endsWith(ext));
  };

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

              <section className="card border-0 shadow-sm mb-5">
            <div
              style={{
                backgroundColor: '#ff7a00',
                color: 'white',
                padding: '20px 24px',
                borderRadius: '16px 16px 0 0',
              }}
            >
              <h2 className="h5 fw-semibold mb-0" style={{ color: 'white', margin: 0 }}>
                Chat de Suporte
              </h2>
              <p className="small mb-0 mt-2" style={{ opacity: 0.9 }}>
                Visualize e responda às mensagens de suporte de técnicos e clientes
              </p>
            </div>
            <div className="card-body p-3 p-md-4">
              {chatRequests.length === 0 ? (
                <p className="text-muted text-center py-4">Não há mensagens de suporte no momento.</p>
              ) : (
                <div className="row">
                  <div className="col-12 col-md-4 mb-3 mb-md-0">
                    <label className="form-label small text-uppercase fw-semibold" style={{ color: '#374151' }}>
                      Selecionar conversa ({chatRequests.length})
                    </label>
                    <select
                      className="form-select"
                      value={selectedRequestId}
                      onChange={(e) => setSelectedRequestId(e.target.value)}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '14px',
                      }}
                    >
                      {chatRequests.map((req) => {
                        const ownerName = req.owner
                          ? [req.owner.firstName, req.owner.lastName].filter(Boolean).join(' ').trim() || req.owner.email || 'Cliente'
                          : 'Cliente';
                        const technicianName = req.technician
                          ? [req.technician.firstName, req.technician.lastName].filter(Boolean).join(' ').trim() || req.technician.email || 'Técnico'
                          : null;
                        const displayName = technicianName ? `${technicianName} / ${ownerName}` : ownerName;
                        return (
                          <option key={req.id} value={req.id}>
                            {displayName} - {req.messageCount} mensagem{req.messageCount !== 1 ? 's' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="col-12 col-md-8">
                    <div
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        minHeight: '300px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      {chatLoading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">A carregar...</span>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <p>Sem mensagens para este pedido.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {messages.map((msg) => {
                            const senderLabel =
                              [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') ||
                              msg.sender?.email ||
                              'Utilizador';
                            const senderRole = msg.sender?.isAdmin
                              ? 'Admin'
                              : msg.sender?.isTechnician
                                ? 'Técnico'
                                : 'Cliente';
                            // Mensagens de suporte sempre à esquerda (enviadas por clientes/técnicos)
                            return (
                              <div
                                key={msg.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-start',
                                }}
                              >
                                <div
                                  style={{
                                    maxWidth: '75%',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    backgroundColor: msg.sender?.isTechnician ? '#e3f2fd' : '#f3f4f6',
                                    borderLeft: msg.sender?.isTechnician ? '3px solid #2196f3' : '3px solid #9e9e9e',
                                    color: '#1f2937',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    position: 'relative',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      marginBottom: '4px',
                                      color: msg.sender?.isTechnician ? '#1976d2' : '#374151',
                                    }}
                                  >
                                    {senderLabel} ({senderRole})
                                  </div>
                                  <div>{msg.content}</div>
                                  {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      {msg.attachments.map((url, idx) => {
                                        const isVideoFile = isVideo(url);
                                        return isVideoFile ? (
                                          <video
                                            key={idx}
                                            src={url}
                                            controls
                                            style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px' }}
                                          />
                                        ) : (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt="Anexo"
                                            style={{
                                              maxWidth: '150px',
                                              maxHeight: '150px',
                                              borderRadius: '8px',
                                              objectFit: 'cover',
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      marginTop: '4px',
                                      opacity: 0.7,
                                      textAlign: 'right',
                                    }}
                                  >
                                    {msg.createdAt &&
                                      new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      style={{
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <input
                          type="file"
                          className="form-control form-control-sm"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleFileChange}
                          disabled={uploading}
                          style={{ fontSize: '14px' }}
                        />
                        {uploading && (
                          <div className="small text-muted mt-2" style={{ fontSize: '12px' }}>
                            A carregar anexos...
                          </div>
                        )}
                        {pendingAttachments.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {pendingAttachments.map((item) =>
                              item.type === 'video' ? (
                                <div key={item.url} className="position-relative">
                                  <video
                                    src={item.url}
                                    controls
                                    style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px' }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute"
                                    onClick={() => handleRemoveAttachment(item.url)}
                                    style={{
                                      top: '4px',
                                      right: '4px',
                                      padding: '2px 6px',
                                      fontSize: '12px',
                                      lineHeight: 1,
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div key={item.url} className="position-relative">
                                  <img
                                    src={item.url}
                                    alt="Pré-visualização"
                                    style={{
                                      maxWidth: '120px',
                                      maxHeight: '120px',
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute"
                                    onClick={() => handleRemoveAttachment(item.url)}
                                    style={{
                                      top: '4px',
                                      right: '4px',
                                      padding: '2px 6px',
                                      fontSize: '12px',
                                      lineHeight: 1,
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={chatContent}
                          onChange={(e) => setChatContent(e.target.value)}
                          placeholder="Digite a sua mensagem de suporte..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                        <button
                          className="btn"
                          type="submit"
                          disabled={!selectedRequestId || uploading || !chatContent.trim()}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#ff7a00',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (!selectedRequestId || uploading || !chatContent.trim()) ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            opacity: (!selectedRequestId || uploading || !chatContent.trim()) ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
};

export default AdminDashboard;
