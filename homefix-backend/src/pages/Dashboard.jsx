import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-2xl font-semibold mb-3">Bem-vindo, {user.firstName}!</h1>
      <div className="bg-white p-6 rounded shadow mb-6">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Tipo:</strong> {user.isAdmin ? "Técnico" : "Cliente"}</p>
        <p><strong>Conta criada em:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={() => navigate("/new-request")} className="bg-blue-600 text-white px-4 py-2 rounded">
          Criar novo pedido
        </button>
        <button onClick={() => navigate("/profile")} className="bg-gray-800 text-white px-4 py-2 rounded">
          Ver perfil
        </button>
        <button onClick={() => navigate("/chat")} className="bg-green-700 text-white px-4 py-2 rounded">
          Mensagens
        </button>
      </div>
    </div>
  )
}