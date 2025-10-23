
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests/mine');
        if (res.data.length > 0) {
          setRequestId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!requestId) return;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${requestId}`);
        setMessages(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
        setLoading(false);
      }
    };
    fetchMessages();
  }, [requestId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content || !requestId) return;
    try {
      await api.post('/messages', { requestId, content });
      setMessages([...messages, { content, sender: { email: 'Você' } }]);
      setContent('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  return (
    <Layout>
      <div>
        <h2>Mensagens</h2>
        {loading ? (
          <p>A carregar...</p>
        ) : (
          <>
            <div className="border p-3 mb-3" style={{ minHeight: '150px' }}>
              {messages.map((msg, i) => (
                <div key={i} className="mb-1">
                  <strong>{msg.sender?.email || 'Desconhecido'}:</strong> {msg.content}
                </div>
              ))}
            </div>
            <form onSubmit={handleSend}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite sua mensagem..."
                />
                <button className="btn btn-primary" type="submit">Enviar</button>
              </div>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Chat;
