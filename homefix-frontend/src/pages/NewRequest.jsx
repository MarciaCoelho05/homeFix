import { useState } from 'react'
import API from '../services/api'
import Navbar from '../components/Navbar'

export default function NewRequest() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', price: ''
  })
  const [status, setStatus] = useState("")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/maintenance-requests', form)
      setStatus("Pedido criado com sucesso!")
      setForm({ title: '', description: '', category: '', price: '' })
    } catch (err) {
      setStatus("Erro ao criar pedido.")
    }
  }

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-lg mx-auto bg-white shadow rounded">
        <h2 className="fs-4 font-bold mb-3">Novo Pedido de Manutenção</h2>
        {status && <p className="mb-2 fs-6 text-blue-500">{status}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="title" placeholder="Título" value={form.title} onChange={handleChange} className="w-full p-2 border rounded" required />
          <textarea name="description" placeholder="Descrição" value={form.description} onChange={handleChange} className="w-full p-2 border rounded" required />
          <input name="category" placeholder="Categoria (ex: canalização)" value={form.category} onChange={handleChange} className="w-full p-2 border rounded" required />
          <input name="price" type="number" placeholder="Preço estimado (€)" value={form.price} onChange={handleChange} className="w-full p-2 border rounded" />
          <button type="submit" className="bg-green-600 text-white py-2 px-3 rounded">Criar Pedido</button>
        </form>
      </div>
    </>
  )
}