import { useState, useEffect } from 'react'
import API from '../services/api'
import ChatMessage from '../components/ChatMessage'
import Navbar from '../components/Navbar'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("")
  const [requestId] = useState("ID_DO_PEDIDO") // substituir dinamicamente conforme necessário

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/${requestId}`)
      setMessages(res.data)
    } catch (err) {
      console.error("Erro ao buscar mensagens:", err)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = async () => {
    try {
      await API.post("/messages", { content, maintenanceRequestId: requestId })
      setContent("")
      fetchMessages()
    } catch (err) {
      setStatus("Erro ao enviar mensagem")
    }
  }

  const user = JSON.parse(localStorage.getItem("user"))

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="fs-4 font-bold mb-3">Chat do Pedido</h2>
        <div className="bg-light p-3 rounded h-96 overflow-y-scroll mb-3">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} isOwn={msg.senderId === user.id} />
          ))}
        </div>
        <div className="d-flex gap-2">
          <input value={content} onChange={e => setContent(e.target.value)} placeholder="Digite sua mensagem" className="flex-1 p-2 border rounded" />
          <button onClick={handleSend} className="bg-blue-600 text-white px-3 rounded">Enviar</button>
        </div>
        {status && <p className="fs-6 mt-2 text-red-500">{status}</p>}
      </div>
    </>
  )
}