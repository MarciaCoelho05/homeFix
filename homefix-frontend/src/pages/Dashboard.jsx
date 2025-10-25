import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';
import api from '../services/api';

const Dashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [completingId, setCompletingId] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState('');

  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const fetchRequests = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      setStatus('');
      try {
        const endpoint = role === 'technician' || role === 'admin' ? '/requests' : '/requests/mine';
        const res = await api.get(endpoint);
        setRequests(res.data || []);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        setError('Não foi possível carregar os pedidos.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [role],
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const assignedRequests = useMemo(() => {
    if (role === 'technician') {
      return requests.filter((request) => {
        const technicianId = request.technicianId || request.technician?.id || null;
        return technicianId === userId;
      });
    }
    return requests;
  }, [requests, role, userId]);

  const availableRequests = useMemo(() => {
    if (role !== 'technician') return [];
    return requests.filter((request) => {
      const technicianId = request.technicianId || request.technician?.id || null;
      return !technicianId;
    });
  }, [requests, role]);

  const respondToRequest = useCallback(
    async (id, action) => {
      try {
        await api.post(`/requests/${id}/${action}`);
        setStatus(action === 'accept' ? 'Pedido aceite com sucesso.' : 'Pedido marcado como pendente.');
        await fetchRequests(true);
      } catch (err) {
        console.error(`Erro ao ${action === 'accept' ? 'aceitar' : 'recusar'} pedido:`, err);
        setError(
          err?.response?.data?.message ||
            `Não foi possível ${action === 'accept' ? 'aceitar' : 'marcar'} este pedido.`,
        );
      }
    },
    [fetchRequests],
  );

  const downloadBase64Pdf = (fileName, base64) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = fileName || 'fatura.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBlob = (data, fileName) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const extractFileName = (disposition, fallback) => {
    if (typeof disposition !== 'string') return fallback;
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return match && match[1] ? match[1] : fallback;
  };

  const handleCompleteRequest = useCallback(
    async (id) => {
      setCompletingId(id);
      setStatus('');
      setError('');
      try {
        const res = await api.post(`/requests/${id}/complete`);
        const message = res.data?.message || 'Pedido concluído com sucesso.';
        setStatus(message);
        if (res.data?.invoice) {
          downloadBase64Pdf(res.data.fileName || `fatura-${id}.pdf`, res.data.invoice);
        }
        await fetchRequests(true);
      } catch (err) {
        console.error('Erro ao concluir pedido:', err);
        setError(err?.response?.data?.message || 'Não foi possível concluir o pedido.');
      } finally {
        setCompletingId('');
      }
    },
    [fetchRequests],
  );

  const handleDeleteRequest = useCallback(
    async (id) => {
      if (!window.confirm('Eliminar este pedido? Esta ação é irreversível.')) return;
      setDeletingRequestId(id);
      setStatus('');
      setError('');
      try {
        await api.delete(`/requests/${id}`);
        setStatus('Pedido eliminado com sucesso.');
        await fetchRequests(true);
      } catch (err) {
        console.error('Erro ao eliminar pedido:', err);
        setError(err?.response?.data?.message || 'Não foi possível eliminar o pedido.');
      } finally {
        setDeletingRequestId('');
      }
    },
    [fetchRequests],
  );

  const handleDownloadInvoice = useCallback(
    async (id) => {
      setDownloadingInvoiceId(id);
      setStatus('');
      setError('');
      try {
        const response = await api.get(`/requests/${id}/invoice`, { responseType: 'blob' });
        const fileName = extractFileName(response.headers['content-disposition'], `fatura-${id}.pdf`);
        downloadBlob(response.data, fileName);
        setStatus('Fatura descarregada com sucesso.');
      } catch (err) {
        console.error('Erro ao descarregar fatura:', err);
        setError(err?.response?.data?.message || 'Nao foi possivel descarregar a fatura.');
      } finally {
        setDownloadingInvoiceId('');
      }
    },
    [],
  );

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '-';
    }
  };

  const renderRequestCard = (request, { showAcceptDecline = false } = {}) => {
    const normalizedStatus = (request.status || '').toLowerCase();
    const isConcluded = normalizedStatus === 'concluido';
    const ownerId = request.ownerId || request.owner?.id || null;
    const technicianId = request.technicianId || request.technician?.id || null;
    const isOwner = ownerId === userId;
    const isAssignedTech = technicianId === userId;
    const canComplete = !isConcluded && ((role === 'technician' && isAssignedTech) || role === 'admin');
    const canDelete = isOwner && role !== 'technician';
    const canDownloadInvoice = isConcluded && (isOwner || isAssignedTech || role === 'admin');
    const canOpenChat = isOwner || isAssignedTech || role === 'admin';

    const actionButtons = [];

    if (showAcceptDecline) {
      actionButtons.push(
        <button
          key="accept"
          className="btn btn-sm btn-primary flex-fill"
          onClick={() => respondToRequest(request.id, 'accept')}
        >
          Aceitar pedido
        </button>,
      );
      actionButtons.push(
        <button
          key="decline"
          className="btn btn-sm btn-outline-secondary flex-fill"
          onClick={() => respondToRequest(request.id, 'decline')}
        >
          Não aceitar
        </button>,
      );
    }

    if (canComplete) {
      actionButtons.push(
        <button
          key="complete"
          className="btn btn-sm btn-success flex-fill"
          onClick={() => handleCompleteRequest(request.id)}
          disabled={completingId === request.id}
        >
          {completingId === request.id ? 'A concluir...' : 'Marcar como concluído'}
        </button>,
      );
    }

    if (canDownloadInvoice) {
      actionButtons.push(
        <button
          key="invoice"
          className="btn btn-sm btn-outline-primary flex-fill"
          onClick={() => handleDownloadInvoice(request.id)}
          disabled={downloadingInvoiceId === request.id}
        >
          {downloadingInvoiceId === request.id ? 'A descarregar...' : 'Descarregar fatura'}
        </button>,
      );
    }

    if (canDelete) {
      actionButtons.push(
        <button
          key="delete"
          className="btn btn-sm btn-outline-danger flex-fill"
          onClick={() => handleDeleteRequest(request.id)}
          disabled={deletingRequestId === request.id}
        >
          {deletingRequestId === request.id ? 'A eliminar...' : 'Eliminar pedido'}
        </button>,
      );
    }

    if (canOpenChat) {
      actionButtons.push(
        <Link
          key="chat"
          className="btn btn-sm btn-outline-secondary flex-fill"
          to={`/chat?requestId=${request.id}`}
        >
          Abrir chat
        </Link>,
      );
    }

    return (
      <div className="card shadow-sm border-0 h-100">
        <div className="card-body d-flex flex-column">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h3 className="h6 fw-semibold mb-0">{request.title}</h3>
            <span className="badge text-bg-light text-uppercase">{request.status || 'pendente'}</span>
          </div>
          <p className="text-muted small mb-2">
            <strong>Categoria:</strong> {request.category || '-'}
          </p>
          {request.description && (
            <p className="text-muted small mb-2">
              <strong>Descrição:</strong> {request.description}
            </p>
          )}
          <p className="text-muted small mb-2">
            <strong>Data preferencial:</strong> {formatDate(request.scheduledAt)}
          </p>
          {request.owner && (
            <p className="text-muted small mb-2">
              <strong>Cliente:</strong>{' '}
              {[request.owner.firstName, request.owner.lastName].filter(Boolean).join(' ') ||
                request.owner.email}
            </p>
          )}
          {request.technician && (
            <p className="text-muted small mb-2">
              <strong>Técnico:</strong>{' '}
              {[request.technician.firstName, request.technician.lastName].filter(Boolean).join(' ') ||
                request.technician.email}
            </p>
          )}
          {request.price != null && (
            <p className="text-muted small mb-2">
              <strong>Preço indicado:</strong> EUR {Number(request.price).toFixed(2)}
            </p>
          )}
          <p className="text-muted small mb-0">
            <strong>Registado em:</strong> {formatDate(request.createdAt)}
          </p>
          {actionButtons.length > 0 && (
            <div className="mt-3 d-flex flex-column flex-sm-row gap-2">{actionButtons}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <HeroBanner
        title={role === 'technician' ? 'Painel do técnico' : 'Os meus pedidos'}
        subtitle={
          role === 'technician'
            ? 'Acompanhe e aceite pedidos de manutenção atribuídos à sua equipa.'
            : 'Acompanhe o estado e os detalhes de todos os seus pedidos.'
        }
        imageUrl="https://images.unsplash.com/photo-1581092795360-7d294c00fdfd?q=80&w=1080&auto=format&fit=crop"
      />

      {status && <div className="alert alert-success py-2">{status}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">A carregar...</span>
          </div>
        </div>
      ) : (
        <>
          {role === 'technician' && (
            <>
              <section className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 fw-semibold mb-0">Pedidos disponíveis</h2>
                  <span className="badge text-bg-secondary">
                    {availableRequests.length} em espera
                  </span>
                </div>
                {availableRequests.length === 0 ? (
                  <p className="text-muted">Não existem pedidos à aguardar aceitação.</p>
                ) : (
                  <div className="row g-3">
                    {availableRequests.map((request) => (
                      <div className="col-12 col-md-6 col-lg-4" key={request.id}>
                        {renderRequestCard(request, { showAcceptDecline: true })}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 fw-semibold mb-0">Pedidos atribuídos</h2>
                  <span className="badge text-bg-secondary">
                    {assignedRequests.length} em curso
                  </span>
                </div>
                {assignedRequests.length === 0 ? (
                  <p className="text-muted">Ainda não aceitou pedidos.</p>
                ) : (
                  <div className="row g-3">
                    {assignedRequests.map((request) => (
                      <div className="col-12 col-md-6 col-lg-4" key={request.id}>
                        {renderRequestCard(request)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {role !== 'technician' && (
            <section className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 fw-semibold mb-0">Pedidos</h2>
                <span className="badge text-bg-secondary">{assignedRequests.length} no total</span>
              </div>
              {assignedRequests.length === 0 ? (
                <p className="text-muted">Nenhum pedido encontrado.</p>
              ) : (
                <div className="row g-3">
                  {assignedRequests.map((request) => (
                    <div className="col-12 col-md-6 col-lg-4" key={request.id}>
                      {renderRequestCard(request)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
