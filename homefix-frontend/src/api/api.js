const BASE_URL = import.meta.env.VITE_API_URL;

// Exemplo: Buscar todos os usuários
export async function getUsers(token) {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}

// Criar novo pedido
export async function createRequest(data, token) {
  const res = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return await res.json();
}

// Buscar todos os pedidos
export async function getRequests(token) {
  const res = await fetch(`${BASE_URL}/requests`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}

// Enviar mensagem
export async function sendMessage(data, token) {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return await res.json();
}

// Buscar mensagens por pedido
export async function getMessages(requestId, token) {
  const res = await fetch(`${BASE_URL}/messages?coreEntityId=eq.${requestId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}