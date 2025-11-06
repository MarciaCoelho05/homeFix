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
        const endpoint = role === 'admin' ? '/requests' : role === 'technician' ? '/requests' : '/requests/mine';
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
      <div 
        className="card border-0 shadow-sm"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        {/* Header com cor laranja */}
        <div
          style={{
            backgroundColor: '#ff7a00',
            color: 'white',
            padding: '20px 24px',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <h1 className="h4 fw-semibold mb-0" style={{ color: 'white', margin: 0 }}>
            {chatTitle}
          </h1>
        </div>

        <div className="p-3 p-md-4">
          {statusMessage && (
            <div className="alert alert-success py-2 mb-3" style={{ borderRadius: '8px' }}>
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="alert alert-danger py-2 mb-3" style={{ borderRadius: '8px' }}>
              {errorMessage}
            </div>
          )}

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
              <label className="form-label small text-uppercase fw-semibold" style={{ color: '#374151' }}>
                Selecionar pedido
              </label>
              <select
                className="form-select"
                value={requestId}
                onChange={handleRequestChange}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                }}
              >
                {requests.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.title} - {req.status}
                  </option>
                ))}
              </select>
            </div>

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
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">A carregar...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>Sem mensagens para este pedido.</p>
                  <p className="small">Envie uma mensagem para começar a conversa!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((msg) => {
                    const senderLabel =
                      [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') ||
                      msg.sender?.email ||
                      'Utilizador';
                    const senderId = msg.senderId || msg.sender?.id || null;
                    const isOwn = String(senderId) === String(userId);
                    const canDelete = role === 'admin' || isOwn;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            backgroundColor: isOwn ? '#ff7a00' : '#f3f4f6',
                            color: isOwn ? 'white' : '#1f2937',
                            fontSize: '14px',
                            lineHeight: '1.4',
                            position: 'relative',
                          }}
                        >
                          {!isOwn && (
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                marginBottom: '4px',
                                opacity: 0.9,
                                color: isOwn ? 'white' : '#374151',
                              }}
                            >
                              {senderLabel}
                            </div>
                          )}
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
                          {canDelete && msg.id && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => handleDeleteMessage(msg.id)}
                              disabled={deletingMessageId === msg.id}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                color: isOwn ? 'rgba(255,255,255,0.7)' : '#dc2626',
                                padding: '2px 4px',
                                fontSize: '10px',
                                textDecoration: 'none',
                              }}
                              title="Eliminar mensagem"
                            >
                              {deletingMessageId === msg.id ? '...' : '×'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSend}
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
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Digite a sua mensagem..."
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
                  disabled={!requestId || uploading || !content.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ff7a00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (!requestId || uploading || !content.trim()) ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    opacity: (!requestId || uploading || !content.trim()) ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  Enviar
                </button>
              </div>
            </form>
          </>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
