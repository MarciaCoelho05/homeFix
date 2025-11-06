import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import HeroBanner from '../components/HeroBanner';
import TechnicianCalendar from '../components/TechnicianCalendar';
import api from '../services/api';

const Dashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [completingId, setCompletingId] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({});
  const [submittingFeedback, setSubmittingFeedback] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [updatingDate, setUpdatingDate] = useState(false);

  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const [userProfile, setUserProfile] = useState(null);

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
    
    if (role === 'technician' || role === 'admin') {
      api.get('/profile')
        .then(res => {
          setUserProfile(res.data);
        })
        .catch(err => {
          console.error('Erro ao carregar perfil:', err);
        });
    }
  }, [fetchRequests, role]);

  const assignedRequests = useMemo(() => {
    if (role === 'technician') {
      return requests.filter((request) => {
        const technicianId = request.technicianId || request.technician?.id || null;
        return String(technicianId) === String(userId);
      });
    }
    return requests;
  }, [requests, role, userId]);

  const availableRequests = useMemo(() => {
    if (role !== 'technician') return [];
    return requests.filter((request) => {
      const technicianId = request.technicianId || request.technician?.id || null;
      const status = (request.status || '').toLowerCase().replace(/_/g, '');
      return !technicianId && status === 'pendente';
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
    (id, currentPrice) => {
      setCurrentRequestId(id);
      setPriceInput(currentPrice != null ? String(currentPrice) : '');
      setShowPriceModal(true);
    },
    [],
  );

  const confirmCompleteRequest = useCallback(
    async () => {
      if (!currentRequestId) return;
      
      const price = parseFloat(priceInput);
      if (!priceInput || isNaN(price) || price < 0) {
        setError('Preço inválido. Insira um valor válido.');
        return;
      }

      setCompletingId(currentRequestId);
      setShowPriceModal(false);
      setStatus('');
      setError('');
      
      try {
        await api.patch(`/requests/${currentRequestId}/price`, { price });
        const res = await api.post(`/requests/${currentRequestId}/complete`);
        const message = res.data?.message || 'Pedido concluído com sucesso.';
        setStatus(message);
        if (res.data?.invoice) {
          downloadBase64Pdf(res.data.fileName || `fatura-${currentRequestId}.pdf`, res.data.invoice);
        }
        await fetchRequests(true);
      } catch (err) {
        console.error('Erro ao concluir pedido:', err);
        setError(err?.response?.data?.message || 'Não foi possível concluir o pedido.');
      } finally {
        setCompletingId('');
        setCurrentRequestId('');
        setPriceInput('');
      }
    },
    [currentRequestId, priceInput, fetchRequests],
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
        setError(err?.response?.data?.message || 'Não foi possível descarregar a fatura.');
      } finally {
        setDownloadingInvoiceId('');
      }
    },
    [],
  );

  const handleFeedbackChange = useCallback((requestId, field, value) => {
    setFeedbackForm((prev) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
      },
    }));
  }, []);

  const handleSubmitFeedback = useCallback(
    async (requestId) => {
      const feedback = feedbackForm[requestId];
      if (!feedback || !feedback.rating) {
        setError('Por favor, selecione uma avaliação.');
        return;
      }

      setSubmittingFeedback(requestId);
      setStatus('');
      setError('');

      try {
        await api.post(`/requests/${requestId}/feedback`, {
          rating: parseInt(feedback.rating, 10),
          comment: feedback.comment || '',
        });
        setStatus('Feedback enviado com sucesso!');
        setFeedbackForm((prev) => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        await fetchRequests(true);
      } catch (err) {
        console.error('Erro ao enviar feedback:', err);
        setError(err?.response?.data?.message || 'Não foi possível enviar o feedback.');
      } finally {
        setSubmittingFeedback('');
      }
    },
    [feedbackForm, fetchRequests],
  );

  const handleUpdateDate = async () => {
    if (!selectedRequest || !newDate) return;
    
    setUpdatingDate(true);
    setError('');
    try {
      // Combinar data e hora
      const dateTime = newTime 
        ? `${newDate}T${newTime}:00`
        : `${newDate}T00:00:00`;
      
      await api.put(`/requests/${selectedRequest.id}`, {
        scheduledAt: dateTime,
      });
      
      setStatus('Data do pedido atualizada com sucesso.');
      setShowDateModal(false);
      setSelectedRequest(null);
      setNewDate('');
      setNewTime('');
      await fetchRequests(true);
    } catch (err) {
      console.error('Erro ao atualizar data:', err);
      setError(err?.response?.data?.message || 'Não foi possível atualizar a data do pedido.');
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleOpenDateModal = (request) => {
    setSelectedRequest(request);
    if (request.scheduledAt) {
      const date = new Date(request.scheduledAt);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].slice(0, 5);
      setNewDate(dateStr);
      setNewTime(timeStr);
    } else {
      setNewDate('');
      setNewTime('');
    }
    setShowDateModal(true);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '-';
    }
  };

  const renderRequestCard = (request, { showAcceptDecline = false } = {}) => {
    const normalizedStatus = (request.status || '').toLowerCase().replace(/_/g, '');
    const isConcluded = normalizedStatus === 'concluido';
    const ownerId = request.ownerId || request.owner?.id || null;
    const technicianId = request.technicianId || request.technician?.id || null;
    // Garantir comparação de strings para IDs
    const isOwner = String(ownerId) === String(userId);
    const isAssignedTech = String(technicianId) === String(userId);
    const canComplete = !isConcluded && ((role === 'technician' && isAssignedTech) || role === 'admin');
    const canDelete = isOwner && role !== 'technician';
    const canDownloadInvoice = isConcluded && (isOwner || isAssignedTech || role === 'admin');
    const canOpenChat = isOwner || isAssignedTech || role === 'admin';
    const hasFeedback = request.feedback && request.feedback.id;
    const canLeaveFeedback = isConcluded && isOwner && role !== 'technician' && !hasFeedback;

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
          onClick={() => handleCompleteRequest(request.id, request.price)}
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
          <div className="d-flex justify-content-between align-items-center mb-2">
            <p className="text-muted small mb-0">
              <strong>Data preferencial:</strong> {formatDate(request.scheduledAt)}
            </p>
            {isAssignedTech && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => handleOpenDateModal(request)}
                title="Alterar data"
              >
                📅
              </button>
            )}
          </div>
          {request.owner && (
            <div className="d-flex align-items-center gap-2 mb-2">
              {(() => {
                const ownerName = [request.owner.firstName, request.owner.lastName].filter(Boolean).join(' ') || request.owner.email || 'Cliente';
                const avatarUrl = request.owner.avatarUrl || 
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=ff7a00&color=fff&rounded=true&size=40`;
                return (
                  <>
                    <img
                      src={avatarUrl}
                      alt={ownerName}
                      className="rounded-circle border"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                    <p className="text-muted small mb-0">
                      <strong>Cliente:</strong> {ownerName}
                    </p>
                  </>
                );
              })()}
            </div>
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
          {(() => {
            const showMedia = (() => {
              if (role === 'admin') return true;
              
              if (isOwner) return true;
              
              if (role === 'technician' && isAssignedTech) {
                const userCategories = Array.isArray(userProfile?.technicianCategory) 
                  ? userProfile.technicianCategory 
                  : [];
                const requestCategory = request.category || '';
                return userCategories.includes(requestCategory);
              }
              
              return false;
            })();
            
            return showMedia && request.mediaUrls && Array.isArray(request.mediaUrls) && request.mediaUrls.length > 0 ? (
              <div className="mt-3 border-top pt-3">
                <h6 className="fw-semibold mb-2">Anexos ({request.mediaUrls.length})</h6>
                <div className="d-flex flex-wrap gap-2">
                  {request.mediaUrls.map((url, index) => {
                  if (!url) return null;
                  const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/i);
                  return (
                    <div key={index} className="position-relative">
                      {isVideo ? (
                        <video
                          src={url}
                          controls
                          style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                          className="border"
                        />
                      ) : (
                        <a href={url} target="_blank" rel="noreferrer" className="d-inline-block">
                          <img
                            src={url}
                            alt={`Anexo ${index + 1}`}
                            style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
                            className="border"
                          />
                        </a>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            ) : null;
          })()}
          {actionButtons.length > 0 && (
            <div className="mt-3 d-flex flex-column flex-sm-row gap-2">{actionButtons}</div>
          )}
          
          {canLeaveFeedback && (
            <div className="mt-3 border-top pt-3">
              <h6 className="fw-semibold mb-2">Deixe o seu feedback</h6>
              <p className="text-muted small mb-3">Como avalia o serviço prestado?</p>
              
              <div className="mb-3">
                <label className="form-label small">Avaliação *</label>
                <div className="d-flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`btn ${
                        feedbackForm[request.id]?.rating >= star
                          ? 'btn-warning'
                          : 'btn-outline-warning'
                      } btn-sm`}
                      onClick={() => handleFeedbackChange(request.id, 'rating', star)}
                      style={{ fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label small">Comentário (opcional)</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Conte-nos sobre a sua experiência..."
                  value={feedbackForm[request.id]?.comment || ''}
                  onChange={(e) => handleFeedbackChange(request.id, 'comment', e.target.value)}
                />
              </div>
              
              <button
                type="button"
                className="btn btn-primary btn-sm w-100"
                onClick={() => handleSubmitFeedback(request.id)}
                disabled={
                  submittingFeedback === request.id || !feedbackForm[request.id]?.rating
                }
              >
                {submittingFeedback === request.id ? 'A enviar...' : 'Enviar feedback'}
              </button>
            </div>
          )}
          
          {hasFeedback && (
            <div className="mt-3 border-top pt-3">
              <h6 className="fw-semibold mb-2">Feedback enviado</h6>
              <div className="d-flex align-items-center mb-2">
                <span className="text-warning me-2" style={{ fontSize: '1.2rem' }}>
                  {'★'.repeat(request.feedback.rating)}
                  {'☆'.repeat(5 - request.feedback.rating)}
                </span>
                <small className="text-muted">
                  {new Date(request.feedback.createdAt).toLocaleDateString('pt-PT')}
                </small>
              </div>
              {request.feedback.comment && (
                <p className="text-muted small mb-0">{request.feedback.comment}</p>
              )}
            </div>
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
      />

      {status && <div className="alert alert-success py-2">{status}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {showDateModal && selectedRequest && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Alterar data do pedido</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDateModal(false);
                    setSelectedRequest(null);
                    setNewDate('');
                    setNewTime('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  <strong>Pedido:</strong> {selectedRequest.title}
                </p>
                <div className="mb-3">
                  <label className="form-label">Nova data</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Hora (opcional)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                  <small className="text-muted">Deixe em branco para usar 00:00</small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDateModal(false);
                    setSelectedRequest(null);
                    setNewDate('');
                    setNewTime('');
                  }}
                  disabled={updatingDate}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateDate}
                  disabled={!newDate || updatingDate}
                >
                  {updatingDate ? 'A atualizar...' : 'Atualizar data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPriceModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Definir preço do serviço</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowPriceModal(false);
                    setCurrentRequestId('');
                    setPriceInput('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Insira o preço do serviço antes de marcar como concluído. Este valor será usado para gerar a fatura.
                </p>
                <div className="mb-3">
                  <label className="form-label">Preço (EUR) <span className="text-muted small">- sem IVA</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                  <small className="text-muted">O preço indicado é sem IVA. O IVA será calculado na fatura se necessário.</small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPriceModal(false);
                    setCurrentRequestId('');
                    setPriceInput('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmCompleteRequest}
                  disabled={!priceInput}
                >
                  Confirmar e concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <h2 className="h5 fw-semibold mb-4">Calendário de pedidos</h2>
                <TechnicianCalendar
                  requests={assignedRequests}
                  onDateSelect={(dayInfo) => {
                    if (dayInfo.requests && dayInfo.requests.length > 0) {
                      // Scroll para o pedido ou mostrar modal
                      const firstRequest = dayInfo.requests[0];
                      handleOpenDateModal(firstRequest);
                    }
                  }}
                  onRequestClick={(request) => {
                    handleOpenDateModal(request);
                  }}
                />
              </section>

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
