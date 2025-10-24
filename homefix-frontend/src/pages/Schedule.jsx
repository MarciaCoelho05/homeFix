import { useState } from 'react'
import Navbar from '../components/Navbar'
import API from '../services/api'

export default function Schedule() {
  const [datetime, setDatetime] = useState("")
  const [status, setStatus] = useState("")
  const [requestId] = useState("ID_DO_PEDIDO") // substituir conforme necessario

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post(`/maintenance-requests/${requestId}/schedule`, { datetime })
      setStatus("Agendamento enviado com sucesso!")
      setDatetime("")
    } catch (err) {
      console.error("Erro ao agendar:", err)
      setStatus("Erro ao enviar agendamento.")
    }
  }

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-lg mx-auto bg-white rounded shadow">
        <h2 className="fs-4 font-bold mb-3">Agendar Manutencao</h2>
        {status && <p className="fs-6 text-blue-500 mb-2">{status}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-secondary">Data e Hora:</span>
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              required
              className="mt-1 block w-full p-2 border rounded"
            />
          </label>
          <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700">
            Enviar Agendamento
          </button>
        </form>
      </div>
    </>
  )
}
