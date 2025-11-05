import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [supportRequestId, setSupportRequestId] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkToken = localStorage.getItem('token');
      const checkRole = localStorage.getItem('role');
      console.log('[FloatingChat] Render check:', { 
        hasToken: !!checkToken, 
        role: checkRole, 
        userId: localStorage.getItem('userId'),
        shouldRender: !!checkToken && checkRole !== 'admin'
      });
    }
  }, [token, role, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const getOrCreateSupportRequest = useCallback(async () => {
    if (!token || !userId || role === 'admin') return null;

    try {
      const myRequests = await api.get('/requests/mine');
      const requests = myRequests.data || [];
      
      let supportRequest = requests.find(req => 
        req.title?.toLowerCase().includes('chat de suporte') || 
        req.title?.toLowerCase().includes('suporte') || 
        req.title?.toLowerCase().includes('apoio') ||
        req.category?.toLowerCase() === 'suporte'
      );

      if (!supportRequest) {
        const newRequest = await api.post('/requests', {
          title: 'Chat de Suporte',
          category: 'Suporte',
          description: 'Conversa de suporte com administrador',
          scheduledAt: new Date().toISOString(),
        });
        supportRequest = newRequest.data;
      }

      return supportRequest.id;
    } catch (err) {
      console.error('Erro ao criar/buscar pedido de suporte:', err);
      return null;
    }
  }, [token, userId, role]);

  const fetchMessages = useCallback(async (requestId) => {
    if (!requestId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/messages/${requestId}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Não foi possível carregar mensagens.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && token && role !== 'admin') {
      let intervalId = null;
      
      const loadChat = async () => {
        const requestId = await getOrCreateSupportRequest();
        if (requestId) {
          setSupportRequestId(requestId);
          fetchMessages(requestId);
          
          intervalId = setInterval(() => {
            fetchMessages(requestId);
          }, 3000);
        }
      };
      
      loadChat();
      
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [isOpen, token, role, getOrCreateSupportRequest, fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!supportRequestId || !content.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      await api.post('/messages', {
        requestId: supportRequestId,
        content: content.trim(),
      });
      setContent('');
      await fetchMessages(supportRequestId);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const shouldRender = token && role !== 'admin';
  
  if (!shouldRender) {
    if (!token) {
      console.log('[FloatingChat] No token, not rendering');
    } else if (role === 'admin') {
      console.log('[FloatingChat] Admin user, not rendering');
    }
    return null;
  }

  console.log('[FloatingChat] Rendering chat button - Token:', !!token, 'Role:', role);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#ff7a00',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(255, 122, 0, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          transition: 'all 0.3s ease',
          fontFamily: 'Arial, sans-serif',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 16px rgba(255, 122, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(255, 122, 0, 0.4)';
        }}
        title="Falar com apoio"
      >
        HF
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: 'calc(100% - 40px)',
            maxWidth: '380px',
            height: '500px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              backgroundColor: '#ff7a00',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h6 style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>Suporte</h6>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                Fale com o administrador
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                A carregar...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                <p>Nenhuma mensagem ainda.</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Envie uma mensagem para começar a conversa!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const senderId = msg.senderId || msg.sender?.id || null;
                const isOwn = String(senderId) === String(userId);
                const senderName = isOwn
                  ? 'Você'
                  : [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') || 
                    msg.sender?.email || 
                    'Administrador';

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
                      }}
                    >
                      {!isOwn && (
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '4px',
                            opacity: 0.8,
                          }}
                        >
                          {senderName}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {msg.attachments.map((url, idx) => {
                            const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/i);
                            return isVideo ? (
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
                                style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px', objectFit: 'cover' }}
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
                        {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSend}
            style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite sua mensagem..."
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
              disabled={!supportRequestId || sending}
            />
            <button
              type="submit"
              disabled={!supportRequestId || !content.trim() || sending}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ff7a00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: (!supportRequestId || !content.trim() || sending) ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </>
  );
};

export default FloatingChat;

