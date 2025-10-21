import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)

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
      <div className="bg-white p-6 rounded shadow">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Tipo:</strong> {user.isAdmin ? "Técnico" : "Cliente"}</p>
        <p><strong>Conta criada em:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  )
}