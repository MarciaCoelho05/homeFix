import { useState, useEffect } from 'react'
import API from '../services/api'
import Navbar from '../components/Navbar'

export default function Profile() {
  const [user, setUser] = useState({})
  const [status, setStatus] = useState("")

  useEffect(() => {
    const localUser = localStorage.getItem("user")
    if (localUser) setUser(JSON.parse(localUser))
  }, [])

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleUpdate = async () => {
    try {
      const res = await API.put(`/users/${user.id}`, user)
      localStorage.setItem("user", JSON.stringify(res.data))
      setStatus("Perfil atualizado!")
    } catch (err) {
      setStatus("Erro ao atualizar perfil.")
    }
  }

  return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
        <h2 className="fs-4 font-bold mb-3">Perfil</h2>
        <input name="firstName" value={user.firstName || ""} onChange={handleChange} placeholder="Nome" className="w-full p-2 mb-2 border rounded" />
        <input name="lastName" value={user.lastName || ""} onChange={handleChange} placeholder="Apelido" className="w-full p-2 mb-2 border rounded" />
        <input name="email" value={user.email || ""} onChange={handleChange} placeholder="Email" className="w-full p-2 mb-2 border rounded" />
        <button onClick={handleUpdate} className="bg-blue-600 text-white px-3 py-2 rounded">Salvar</button>
        {status && <p className="fs-6 mt-2 text-green-500">{status}</p>}
      </div>
    </>
  )
}