import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRequestId = searchParams.get("requestId") || "";
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const [requests, setRequests] = useState([]);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const fetchMessages = useCallback(async (id) => {
    if (!id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/messages/${id}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const endpoint = role === "technician" || role === "admin" ? "/requests" : "/requests/mine";
        const res = await api.get(endpoint);
        const list = res.data || [];
        setRequests(list);
        if (initialRequestId && list.some((req) => req.id === initialRequestId)) {
          setRequestId(initialRequestId);
        } else if (!initialRequestId && list.length > 0) {
          setRequestId(list[0].id);
          setSearchParams({ requestId: list[0].id });
        }
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
      } finally {
        setRequestsLoading(false);
      }
    };
    loadRequests();
  }, [initialRequestId, role, setSearchParams]);

  useEffect(() => {
    fetchMessages(requestId);
  }, [requestId, fetchMessages]);

  const handleRequestChange = (event) => {
    const selected = event.target.value;
    setRequestId(selected);
    if (selected) {
      setSearchParams({ requestId: selected });
    } else {
      setSearchParams({});
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !requestId) return;
    try {
      await api.post("/messages", { requestId, content: content.trim() });
      setContent("");
      fetchMessages(requestId);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  return (
    <Layout>
      <div className="col-12 col-lg-8">
        <h2 className="mb-3">Mensagens</h2>

        {requestsLoading ? (
          <p>A carregar pedidos...</p>
        ) : requests.length === 0 ? (
          <p className="text-muted">Ainda nao tem pedidos para conversar.</p>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label small text-uppercase">Selecionar pedido</label>
              <select className="form-select" value={requestId} onChange={handleRequestChange}>
                {requests.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.title} — {req.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="border p-3 mb-3" style={{ minHeight: "180px" }}>
              {loading ? (
                <p>A carregar mensagens...</p>
              ) : messages.length === 0 ? (
                <p className="text-muted">Sem mensagens para este pedido.</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className="mb-2">
                    <strong>{msg.sender?.email || "Utilizador"}:</strong> {msg.content}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSend}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite a sua mensagem..."
                />
                <button className="btn btn-primary" type="submit" disabled={!requestId}>
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
