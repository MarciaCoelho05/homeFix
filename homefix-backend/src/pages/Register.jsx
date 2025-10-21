import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

export default function Register() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", birthDate: ""
  })
  const navigate = useNavigate()
  const [error, setError] = useState("")

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/auth/register', form)
      navigate("/login")
    } catch (err) {
      setError("Erro ao registar. Tente novamente.")
    }
  }

  return (
    <div className="min-h-screen flex align-items-center justify-content-center bg-light">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="fs-4 font-bold mb-3 text-center">Registar</h2>
        {error && <p className="text-red-500 mb-2 fs-6">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input name="firstName" placeholder="Nome" onChange={handleChange} required className="p-2 border rounded" />
          <input name="lastName" placeholder="Apelido" onChange={handleChange} required className="p-2 border rounded" />
        </div>
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required className="w-full mt-3 p-2 border rounded" />
        <input name="password" type="password" placeholder="Senha" onChange={handleChange} required className="w-full mt-3 p-2 border rounded" />
        <input name="birthDate" type="date" placeholder="Data de nascimento" onChange={handleChange} required className="w-full mt-3 p-2 border rounded" />
        <button type="submit" className="w-full bg-green-600 text-white py-2 mt-3 rounded hover:bg-green-700">
          Criar Conta
        </button>
      </form>
    </div>
  )
}