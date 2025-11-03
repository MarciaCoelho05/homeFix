import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRequestId = searchParams.get('requestId') || '';
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const [requests, setRequests] = useState([]);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState('');

  const fetchMessages = useCallback(
    async (id) => {
      if (!id) {
        setMessages([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatusMessage('');
      setErrorMessage('');
      try {
        const res = await api.get(`/messages/${id}`);
        setMessages(res.data || []);
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
        setErrorMessage('Não foi possível carregar mensagens.');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem('lastChatVisit', new Date().toISOString());
    window.dispatchEvent(new CustomEvent('chatVisited'));
  }, []);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const endpoint = role === 'technician' || role === 'admin' ? '/requests' : '/requests/mine';
        const res = await api.get(endpoint);
        const list = res.data || [];
        const visibleRequests =
          role === 'technician' && userId
            ? list.filter((req) => {
                const technicianId = req.technicianId || req.technician?.id || null;
                return String(technicianId) === String(userId);
              })
            : list;
        setRequests(visibleRequests);
        if (initialRequestId && visibleRequests.some((req) => String(req.id) === String(initialRequestId))) {
          setRequestId(initialRequestId);
        } else if (!initialRequestId && visibleRequests.length > 0) {
          setRequestId(visibleRequests[0].id);
          setSearchParams({ requestId: visibleRequests[0].id });
        }
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        setErrorMessage('Não foi possível carregar pedidos.');
      } finally {
        setRequestsLoading(false);
      }
    };
    loadRequests();
  }, [initialRequestId, role, setSearchParams, userId]);

  useEffect(() => {
    fetchMessages(requestId);
  }, [requestId, fetchMessages]);

  const handleRequestChange = (event) => {
    const selected = event.target.value;
    setRequestId(selected);
    setStatusMessage('');
    setErrorMessage('');
    if (selected) {
      setSearchParams({ requestId: selected });
    } else {
      setSearchParams({});
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
      setErrorMessage('Não foi possível carregar os anexos.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (url) => {
    setPendingAttachments((prev) => prev.filter((item) => item.url !== url));
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!requestId) return;
    const text = content.trim();
    if (!text && pendingAttachments.length === 0) return;

    try {
      await api.post('/messages', {
        requestId,
        content: text,
        attachments: pendingAttachments.map((item) => item.url),
      });
      setContent('');
      setPendingAttachments([]);
      setStatusMessage('Mensagem enviada.');
      fetchMessages(requestId);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setErrorMessage(err?.response?.data?.message || 'Não foi possível enviar a mensagem.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Eliminar esta mensagem?')) return;
    setDeletingMessageId(messageId);
    setStatusMessage('');
    setErrorMessage('');
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setStatusMessage('Mensagem eliminada.');
    } catch (err) {
      console.error('Erro ao eliminar mensagem:', err);
      setErrorMessage(err?.response?.data?.message || 'Não foi possível eliminar a mensagem.');
    } finally {
      setDeletingMessageId('');
    }
  };

  const isVideo = (url = '') => {
    const value = url.toLowerCase();
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some((ext) => value.endsWith(ext));
  };

  const chatTitle = role === 'technician' || role === 'admin' ? 'Conversas' : 'Chat com técnico';

  return (
    <Layout>
      <div className="card border-0 shadow-sm p-4 p-md-5">
        <h1 className="h4 fw-semibold mb-4">{chatTitle}</h1>

        {statusMessage && <div className="alert alert-success py-2">{statusMessage}</div>}
        {errorMessage && <div className="alert alert-danger py-2">{errorMessage}</div>}

        {requestsLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">A carregar pedidos...</span>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-muted">Não tem pedidos associados ao chat.</p>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label small text-uppercase">Selecionar pedido</label>
              <select className="form-select" value={requestId} onChange={handleRequestChange}>
                {requests.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.title} - {req.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="border p-3 mb-3" style={{ minHeight: '180px' }}>
              {loading ? (
                <p>A carregar mensagens...</p>
              ) : messages.length === 0 ? (
                <p className="text-muted">Sem mensagens para este pedido.</p>
              ) : (
                messages.map((msg) => {
                  const senderLabel =
                    [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') ||
                    msg.sender?.email ||
                    'Utilizador';
                  const senderId = msg.senderId || msg.sender?.id || null;
                  const canDelete = role === 'admin' || String(senderId) === String(userId);
                  return (
                    <div key={msg.id} className="mb-3 border-bottom pb-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{senderLabel}:</strong> {msg.content}
                        </div>
                        {canDelete && msg.id && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => handleDeleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                          >
                            {deletingMessageId === msg.id ? 'A eliminar...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((url) =>
                            isVideo(url) ? (
                              <video
                                key={url}
                                src={url}
                                controls
                                style={{ maxWidth: '180px', borderRadius: '8px' }}
                              />
                            ) : (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="d-inline-block"
                              >
                                <img
                                  src={url}
                                  alt="Anexo"
                                  style={{ maxWidth: '120px', borderRadius: '8px' }}
                                />
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      {msg.createdAt && (
                        <div className="text-muted small mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend}>
              <div className="mb-2">
                <input
                  type="file"
                  className="form-control"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading && <div className="small text-muted mt-1">A carregar anexos...</div>}
                {pendingAttachments.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {pendingAttachments.map((item) =>
                      item.type === 'video' ? (
                        <div key={item.url} className="position-relative">
                          <video
                            src={item.url}
                            controls
                            style={{ maxWidth: '180px', borderRadius: '8px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={() => handleRemoveAttachment(item.url)}
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <div key={item.url} className="position-relative">
                          <img
                            src={item.url}
                            alt="Pre-visualizacao"
                            style={{ maxWidth: '120px', borderRadius: '8px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={() => handleRemoveAttachment(item.url)}
                          >
                            &times;
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Digite a sua mensagem..."
                />
                <button className="btn btn-primary" type="submit" disabled={!requestId || uploading}>
                  Enviar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Chat;
